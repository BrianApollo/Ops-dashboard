/**
 * mapTemplateCreative
 *
 * Maps a loaded FbCreative (from an existing ad's creative) into the
 * AdCreativeConfig + pageId that createAdsBatch expects.
 */

import type { FbCreative } from '../../../../features/campaigns';
import type { AdCreativeConfig } from '../../../../features/campaigns/launch/fbLaunchApi';

export interface MappedTemplateCreative {
  pageId: string;
  adCreative: AdCreativeConfig;
}

export function mapTemplateCreative(
  creative: FbCreative,
  status: 'ACTIVE' | 'PAUSED' = 'PAUSED',
): MappedTemplateCreative {
  const pageId = creative.object_story_spec?.page_id ?? '';
  const videoData = creative.object_story_spec?.video_data;

  return {
    pageId,
    adCreative: {
      websiteUrl: videoData?.call_to_action?.value?.link ?? '',
      callToAction: videoData?.call_to_action?.type ?? 'SHOP_NOW',
      bodies: creative.asset_feed_spec?.bodies?.map((b) => b.text) ?? [],
      titles: creative.asset_feed_spec?.titles?.map((t) => t.text) ?? [],
      descriptions: creative.asset_feed_spec?.descriptions?.map((d) => d.text) ?? [],
      urlTags: creative.url_tags ?? '',
      advantagePlusCreative: !!creative.degrees_of_freedom_spec,
      status,
    },
  };
}
