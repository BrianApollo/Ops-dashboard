/**
 * Profile types for campaign launch flow.
 */

export type ProfileStatus = 'Active' | 'Inactive';

export interface Profile {
    id: string;           // Airtable record ID
    profileId: string;    // Profile ID field
    profileName: string;  // Profile Name field
    status: ProfileStatus;
    permanentToken: string;
}
