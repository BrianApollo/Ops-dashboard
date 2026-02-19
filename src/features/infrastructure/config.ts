/**
 * Infrastructure Airtable Configuration
 *
 * Table IDs and field name constants for the 5 infrastructure tables.
 * Single source of truth for all Airtable field mappings.
 */

// =============================================================================
// TABLE IDS
// =============================================================================

export const TABLES = {
  profiles: 'tble3Qky3A2j8LpSj',
  bms: 'tbl1xnWkoju7WG8lb',
  adaccounts: 'tbltReEL235grY3Im',
  pages: 'tblUwiY8UQVi3yXBU',
  pixels: 'tblsMDmQedp4B3pB8',
} as const;

// =============================================================================
// FIELD NAMES (by table)
// =============================================================================

export const FIELDS = {
  profiles: {
    profileId: 'Profile ID',
    profileName: 'Profile Name',
    profileStatus: 'Profile Status',
    profileEmail: 'Profile Email',
    profileBirthDate: 'Profile Birth Date',
    profileLink: 'Profile Link',
    permanentToken: 'Permanent Token',
    permanentTokenEndDate: 'Permanent Token End Date',
    tokenValid: 'Token Valid',
    linkedBm: 'Linked BM',
    linkedPages: 'Linked Pages',
    profileFbPassword: 'Profile FB Password',
    profileEmailPassword: 'Profile Email Password',
    profile2fa: 'Profile 2FA',
    profileReviewDate: 'Profile Review Date',
    profileSecurityEmail: 'Profile Security Email',
    securityEmailPassword: 'Security Email Password',
    proxy: 'Proxy',
    profileYoutubeHandle: 'Profile YouTube Handle',
    uid: 'UID',
    profileGender: 'Profile Gender',
    profileLocation: 'Profile Location',
    profileYearCreated: 'Profile Year Created',
    lastSync: 'Last Sync',
    hidden: 'Hidden',
  },

  bms: {
    bmId: 'BM ID',
    bmName: 'BM Name',
    bmStatus: 'BM Status',
    verificationStatus: 'Verification Status',
    linkedProfile: 'Linked Profile',
    linkedAdAccs: 'Linked Ad Accs',
    linkedPixels: 'Linked Pixels',
    ownedPixels: 'Owned Pixels',
    systemUserId: 'System User ID',
    systemUserToken: 'System User Token',
    systemUserCreated: 'System User Created',
    lastSynced: 'Last Synced',
    hidden: 'Hidden',
  },

  adaccounts: {
    adAccId: 'Ad Acc ID',
    adAccName: 'Ad Acc Name',
    adAccStatus: 'Ad Acc Status',
    currency: 'Currency',
    amountSpent: 'Amount Spent',
    timezone: 'Timezone',
    linkedBm: 'Linked BM',
    lastSynced: 'Last Synced',
    hidden: 'Hidden',
  },

  pages: {
    pageId: 'Page ID',
    pageName: 'Page Name',
    published: 'Published',
    pageLink: 'Page Link',
    fanCount: 'Fan Count',
    linkedProfiles: 'Linked Profiles',
    lastSynced: 'Last Synced',
    hidden: 'Hidden',
  },

  pixels: {
    pixelId: 'Pixel ID',
    pixelName: 'Pixel Name',
    available: 'Available',
    lastFiredTime: 'Last Fired Time',
    linkedBms: 'Linked BMs',
    ownerBm: 'Owner BM',
    lastSynced: 'Last Synced',
    hidden: 'Hidden',
  },
} as const;
