/**
 * Infrastructure Domain Models
 *
 * Typed interfaces for all 5 infrastructure entity types.
 * These map to Airtable records but are decoupled from field names.
 */

// =============================================================================
// ENTITY TYPES
// =============================================================================

export type EntityType = 'profiles' | 'bms' | 'adaccounts' | 'pages' | 'pixels';

export interface InfraProfile {
  id: string;
  profileId: string;
  profileName: string;
  profileStatus: string;
  permanentToken: string;
  permanentTokenEndDate: string;
  tokenValid: boolean;
  linkedBm: string[];
  linkedPages: string[];
  lastSync: string;
  hidden: boolean;
  // Setup fields
  profileEmail: string;
  profileFbPassword: string;
  profileEmailPassword: string;
  profile2fa: string;
  profileBirthDate: string;
  profileLink: string;
  profileReviewDate: string;
  profileSecurityEmail: string;
  securityEmailPassword: string;
  proxy: string;
  profileYoutubeHandle: string;
  profileGender: string;
  profileLocation: string;
  profileYearCreated: string;
  uid: string;
}

export interface InfraBM {
  id: string;
  bmId: string;
  bmName: string;
  bmStatus: string;
  verificationStatus: string;
  linkedProfile: string[];
  linkedAdAccs: string[];
  linkedPixels: string[];
  ownedPixels: string[];
  systemUserId: string;
  systemUserToken: string;
  systemUserCreated: string;
  lastSynced: string;
  hidden: boolean;
}

export interface InfraAdAccount {
  id: string;
  adAccId: string;
  adAccName: string;
  adAccStatus: string;
  currency: string;
  amountSpent: number;
  timezone: string;
  linkedBm: string[];
  lastSynced: string;
  hidden: boolean;
}

export interface InfraPage {
  id: string;
  pageId: string;
  pageName: string;
  published: string;
  pageLink: string;
  fanCount: number;
  linkedProfiles: string[];
  lastSynced: string;
  hidden: boolean;
}

export interface InfraPixel {
  id: string;
  pixelId: string;
  pixelName: string;
  available: string;
  lastFiredTime: string;
  linkedBms: string[];
  ownerBm: string[];
  lastSynced: string;
  hidden: boolean;
}

// =============================================================================
// COMPOSITE TYPES
// =============================================================================

export interface InfraData {
  profiles: InfraProfile[];
  bms: InfraBM[];
  adaccounts: InfraAdAccount[];
  pages: InfraPage[];
  pixels: InfraPixel[];
}

export interface TreeConnection {
  from: string;     // "type-id"
  to: string;       // "type-id"
  type: 'profile-bm' | 'profile-page' | 'bm-adaccount' | 'bm-pixel';
  isOwner?: boolean;
}

export interface NodePosition {
  x: number;
  y: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  type: string;
  id: string;
}

export interface TreeFilterState {
  adaccount: { active: boolean; disabled: boolean; pending: boolean; unknown: boolean };
  bm: { active: boolean; disabled: boolean; pending: boolean; unknown: boolean };
}

export interface SelectedNode {
  type: EntityType;
  id: string;
}

export type ConnectedByType = {
  [K in EntityType]: Array<InfraProfile | InfraBM | InfraAdAccount | InfraPage | InfraPixel>;
};
