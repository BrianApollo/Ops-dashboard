/**
 * Shared logic for uploading videos to Facebook.
 * Used by both the pre-launch manual uploader and the launch runner.
 */

import * as fb from '../fbLaunchApi';
import { CF_R2_PUBLIC_URL } from '../../../../core/storage/cloudflare/config';

export interface VideoUploadItem {
    id: string; // Identifier (e.g., name or unique ID) to track result back to source
    name: string;
    url: string;
}

export interface VideoUploadResult {
    id: string;
    success: boolean;
    fbVideoId?: string;
    error?: string;
    // We can pass back the item itself if needed for context
    item: VideoUploadItem;
}

export interface UploadQueueOptions {
    accessToken: string;
    adAccountId: string;
    batchSize?: number;
    delayBetweenBatchesMs?: number;
    /**
     * Optional check to cancel operation mid-stream.
     * Return true to stop.
     */
    shouldStop?: () => boolean;
    /**
     * Callback for when an entire batch is starting
     */
    onBatchStart?: (items: VideoUploadItem[]) => void;
    /**
     * Callback for each item's result
     */
    onItemComplete?: (result: VideoUploadResult) => void;
    /**
     * Number of times to retry failed uploads. Default 0.
     */
    maxRetries?: number;
    /**
     * Delay in ms between retries. Default 1000.
     */
    retryDelayMs?: number;
}

/**
 * Uploads a single batch of videos and parses the results.
 * Returns a list of results corresponding to the input items.
 */
// TEMP: Track failed videos to simulate transient errors
// TODO: REMOVE THIS ENTIRE DEBUG LOGIC SET WHEN TESTING IS DONE
const debugSimulatedFailures = new Set<string>();

export async function uploadVideoBatchSafe(
    accessToken: string,
    adAccountId: string,
    items: VideoUploadItem[]
): Promise<VideoUploadResult[]> {
    try {
        // SIMULATE ERRORS: Randomly fail 5 videos once
        // TODO: REMOVE THIS ENTIRE MAPPING BLOCK
        /*
        const itemsToUpload = items.map(item => {
             // If we haven't failed 5 items yet, and this one hasn't failed before, 30% chance to fail
             // CHECK: Only fail if retry count for this item < 1 (basically fail first time only)
             if (debugSimulatedFailures.size < 5 && !debugSimulatedFailures.has(item.name) && Math.random() < 0.5) {
                 debugSimulatedFailures.add(item.name);
                 return { ...item, shouldFail: true };
             }
             return { ...item, shouldFail: false };
        });
        */
        const itemsToUpload = items.map(item => ({ ...item, shouldFail: false })); // Forced disabled

        // Filter out the ones we want to fail from the actual API call
        // TODO: REMOVE THIS, use original 'items' in API call
        const validItems = itemsToUpload.filter(i => !i.shouldFail);

        let apiResults: any[] = [];

        if (validItems.length > 0) {
            const { data } = await fb.uploadVideoBatch(
                accessToken,
                adAccountId,
                validItems.map(v => {
                    if (CF_R2_PUBLIC_URL && v.url.startsWith(CF_R2_PUBLIC_URL)) {
                        return { name: v.name, url: v.url };
                    }

                    const lastSlash = v.url.lastIndexOf('/');
                    const encodedUrl = lastSlash !== -1
                        ? v.url.substring(0, lastSlash + 1) + encodeURIComponent(encodeURIComponent(v.url.substring(lastSlash + 1)))
                        : v.url;
                    return { name: v.name, url: encodedUrl };
                })
            );
            apiResults = Array.isArray(data) ? data : [];
        }

        // Map back to original items including the simulated failures
        let apiResultIndex = 0;

        return itemsToUpload.map(item => {
            if (item.shouldFail) {
                console.log(`[DEBUG] Simulating failure for video: ${item.name}`);
                return {
                    id: item.id,
                    success: false,
                    error: 'Simulated random failure for testing',
                    item
                };
            }

            // Get corresponding result from API response
            const resItem = apiResults[apiResultIndex++];

            if (!resItem) {
                return {
                    id: item.id,
                    success: false,
                    error: 'No response from API',
                    item
                };
            }

            // Normal processing
            if (resItem.code === 200) {
                try {
                    const body = JSON.parse(resItem.body);
                    if (body.id) {
                        return {
                            id: item.id,
                            success: true,
                            fbVideoId: body.id,
                            item
                        };
                    } else {
                        return {
                            id: item.id,
                            success: false,
                            error: 'No video ID in response',
                            item
                        };
                    }
                } catch {
                    return {
                        id: item.id,
                        success: false,
                        error: 'Invalid response body',
                        item
                    };
                }
            } else {
                // Start with a generic error
                let errorMsg = `HTTP ${resItem.code}`;
                // Try to extract more detail
                try {
                    const body = JSON.parse(resItem.body);
                    if (body.error?.message) {
                        errorMsg = body.error.message;
                    }
                } catch {
                    // ignore parse error, stick to code
                }
                return {
                    id: item.id,
                    success: false,
                    error: errorMsg,
                    item
                };
            }
        });
    } catch (err) {
        // Network or top-level API error
        const msg = (err as Error).message || 'Batch upload exception';
        return items.map(item => ({
            id: item.id,
            success: false,
            error: msg,
            item
        }));
    }
}

/**
 * Processes a list of videos in batches.
 * Handles slicing, delays, and callbacks.
 */
export async function processVideoUploadQueue(
    items: VideoUploadItem[],
    options: UploadQueueOptions
): Promise<void> {
    const {
        accessToken,
        adAccountId,
        batchSize = 10,
        delayBetweenBatchesMs = 5000,
        shouldStop = () => false,
        onBatchStart,
        onItemComplete,
        maxRetries = 0,
        retryDelayMs = 1000
    } = options;

    // Clear debug failures on new queue start so we can test again
    // TODO: REMOVE THIS BLOCK
    if (items.length > 0) {
        debugSimulatedFailures.clear();
    }

    // Split into batches
    const batches: VideoUploadItem[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
        if (shouldStop()) break;

        const batch = batches[i];

        // Notify start
        if (onBatchStart) {
            onBatchStart(batch);
        }

        // Delay if not first batch
        if (i > 0 && delayBetweenBatchesMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatchesMs));
        }

        if (shouldStop()) break;

        if (shouldStop()) break;

        // Execute upload (initial attempt)
        let results = await uploadVideoBatchSafe(accessToken, adAccountId, batch);

        // Handle Retries
        let retriesLeft = maxRetries;
        while (retriesLeft > 0 && !shouldStop()) {
            const failedItems = results.filter(r => !r.success);
            if (failedItems.length === 0) break; // All good!

            // Wait before retry
            if (retryDelayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            }

            if (shouldStop()) break;

            // Retry only the failed items
            const retryResults = await uploadVideoBatchSafe(
                accessToken,
                adAccountId,
                failedItems.map(r => r.item)
            );

            // Merge new results back into main results array
            results = results.map(originalResult => {
                // If this item was a failure, look for its retry result
                if (!originalResult.success) {
                    const newResult = retryResults.find(rr => rr.item.name === originalResult.item.name);
                    return newResult || originalResult;
                }
                return originalResult;
            });

            retriesLeft--;
        }

        // Final Fallback: Try R2 Public URL for any remaining failures
        const finalFailures = results.filter(r => !r.success);
        if (finalFailures.length > 0 && !shouldStop() && CF_R2_PUBLIC_URL) {
            console.info(`[Video Upload] Max retries exhausted for ${finalFailures.length} videos. Attempting fallback to R2...`);

            const fallbackItems = finalFailures.map(r => {
                const item = r.item;
                // Construct new R2 URL
                const r2Url = CF_R2_PUBLIC_URL!;
                const baseUrl = r2Url.endsWith('/') ? r2Url.slice(0, -1) : r2Url;

                let newUrl: string;
                try {
                    // Try to parse as full URL first
                    const urlObj = new URL(item.url);
                    const cleanPath = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
                    newUrl = `${baseUrl}/${cleanPath}`;
                } catch {
                    // If URL parsing fails, treat the entire string as a path
                    // Extract everything after the domain
                    const pathMatch = item.url.match(/^[^/]+\/(.+)$/);
                    if (pathMatch) {
                        // We found a domain followed by a path (e.g., "test.com/folder1/folder2/video.mp4")
                        newUrl = `${baseUrl}/${pathMatch[1]}`;
                    } else {
                        // Fallback to filename only if no path structure is found
                        const lastSlash = item.url.lastIndexOf('/');
                        const filename = lastSlash !== -1 ? item.url.substring(lastSlash + 1) : item.url;
                        newUrl = `${baseUrl}/${filename}`;
                    }
                }

                console.info(`[Video Upload] Switching ${item.name} to R2: ${newUrl}`);

                return {
                    ...item,
                    url: newUrl
                };
            });

            // Single attempt for fallback
            const fallbackResults = await uploadVideoBatchSafe(
                accessToken,
                adAccountId,
                fallbackItems
            );

            // Merge fallback results
            results = results.map(originalResult => {
                if (!originalResult.success) {
                    const fbResult = fallbackResults.find(fr => fr.item.name === originalResult.item.name);
                    return fbResult || originalResult;
                }
                return originalResult;
            });
        }

        // Notify results (final status after all retries)
        if (onItemComplete) {
            results.forEach(result => onItemComplete(result));
        }
    }
}
