/**
 * Facebook Marketing API Feature
 *
 * Exports for Facebook Marketing API integration.
 */

export * from './types';
export * from './api';
export { useFacebookAds } from './useFacebookAds';
export { useFacebookPixels } from './useFacebookPixels';
export { useFacebookPages } from './useFacebookPages';
export type {
    FacebookUser,
    FacebookAdAccount,
    FacebookAdsData,
    UseFacebookAdsReturn,
} from './useFacebookAds';
export type { FacebookPixel, UseFacebookPixelsReturn } from './useFacebookPixels';
export type { FacebookPage, UseFacebookPagesReturn } from './useFacebookPages';
