/**
 * Airtable Request Throttle
 *
 * Airtable has a rate limit of 5 requests per second per base.
 * This module queues requests to avoid hitting that limit.
 */

// Queue of pending requests
const requestQueue: Array<() => Promise<void>> = [];
let isProcessing = false;
let lastRequestTime = 0;

// Minimum delay between requests (200ms = 5 requests/second max)
const MIN_DELAY_MS = 200;

/**
 * Process the request queue one at a time with delays
 */
async function processQueue(): Promise<void> {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;

  while (requestQueue.length > 0) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    // Wait if we're going too fast
    if (timeSinceLastRequest < MIN_DELAY_MS) {
      await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - timeSinceLastRequest));
    }

    const nextRequest = requestQueue.shift();
    if (nextRequest) {
      lastRequestTime = Date.now();
      await nextRequest();
    }
  }

  isProcessing = false;
}

/**
 * Throttled fetch for Airtable API calls.
 * Queues requests to avoid exceeding rate limits.
 */
export function throttledAirtableFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const response = await fetch(url, options);
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });

    processQueue();
  });
}
