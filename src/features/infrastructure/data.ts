/**
 * Infrastructure Airtable CRUD
 *
 * Data layer for all 5 infrastructure tables.
 * Uses throttled fetch and maps Airtable fields to typed interfaces.
 */

import { airtableFetch } from '../../core/data/airtable-client';
import { TABLES, FIELDS } from './config';
import type {
  InfraProfile,
  InfraBM,
  InfraAdAccount,
  InfraPage,
  InfraPixel,
} from './types';

// =============================================================================
// HELPERS
// =============================================================================

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}


function getLinkedIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return [];
}

function str(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

function num(val: unknown): number {
  return typeof val === 'number' ? val : 0;
}

function bool(val: unknown): boolean {
  return val === true;
}

async function fetchAllRecords(tableId: string): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = offset ? `${tableId}?offset=${offset}` : tableId;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    all.push(...data.records);
    offset = data.offset;
  } while (offset);

  return all;
}

// =============================================================================
// MAPPERS
// =============================================================================

const FP = FIELDS.profiles;
const FB = FIELDS.bms;
const FA = FIELDS.adaccounts;
const FG = FIELDS.pages;
const FX = FIELDS.pixels;

function mapProfile(r: AirtableRecord): InfraProfile {
  const f = r.fields;
  return {
    id: r.id,
    profileId: str(f[FP.profileId]),
    profileName: str(f[FP.profileName]),
    profileStatus: str(f[FP.profileStatus]),
    permanentToken: str(f[FP.permanentToken]),
    permanentTokenEndDate: str(f[FP.permanentTokenEndDate]),
    tokenValid: bool(f[FP.tokenValid]),
    linkedBm: getLinkedIds(f[FP.linkedBm]),
    linkedPages: getLinkedIds(f[FP.linkedPages]),
    lastSync: str(f[FP.lastSync]),
    hidden: bool(f[FP.hidden]),
    profileEmail: str(f[FP.profileEmail]),
    profileFbPassword: str(f[FP.profileFbPassword]),
    profileEmailPassword: str(f[FP.profileEmailPassword]),
    profile2fa: str(f[FP.profile2fa]),
    profileBirthDate: str(f[FP.profileBirthDate]),
    profileLink: str(f[FP.profileLink]),
    profileReviewDate: str(f[FP.profileReviewDate]),
    profileSecurityEmail: str(f[FP.profileSecurityEmail]),
    securityEmailPassword: str(f[FP.securityEmailPassword]),
    proxy: str(f[FP.proxy]),
    profileYoutubeHandle: str(f[FP.profileYoutubeHandle]),
    uid: str(f[FP.uid]),
  };
}

function mapBM(r: AirtableRecord): InfraBM {
  const f = r.fields;
  return {
    id: r.id,
    bmId: str(f[FB.bmId]),
    bmName: str(f[FB.bmName]),
    bmStatus: str(f[FB.bmStatus]),
    verificationStatus: str(f[FB.verificationStatus]),
    linkedProfile: getLinkedIds(f[FB.linkedProfile]),
    linkedAdAccs: getLinkedIds(f[FB.linkedAdAccs]),
    linkedPixels: getLinkedIds(f[FB.linkedPixels]),
    ownedPixels: getLinkedIds(f[FB.ownedPixels]),
    systemUserId: str(f[FB.systemUserId]),
    systemUserToken: str(f[FB.systemUserToken]),
    systemUserCreated: str(f[FB.systemUserCreated]),
    lastSynced: str(f[FB.lastSynced]),
    hidden: bool(f[FB.hidden]),
  };
}

function mapAdAccount(r: AirtableRecord): InfraAdAccount {
  const f = r.fields;
  return {
    id: r.id,
    adAccId: str(f[FA.adAccId]),
    adAccName: str(f[FA.adAccName]),
    adAccStatus: str(f[FA.adAccStatus]),
    currency: str(f[FA.currency]),
    amountSpent: num(f[FA.amountSpent]),
    timezone: str(f[FA.timezone]),
    linkedBm: getLinkedIds(f[FA.linkedBm]),
    lastSynced: str(f[FA.lastSynced]),
    hidden: bool(f[FA.hidden]),
  };
}

function mapPage(r: AirtableRecord): InfraPage {
  const f = r.fields;
  return {
    id: r.id,
    pageId: str(f[FG.pageId]),
    pageName: str(f[FG.pageName]),
    published: str(f[FG.published]),
    pageLink: str(f[FG.pageLink]),
    fanCount: num(f[FG.fanCount]),
    linkedProfiles: getLinkedIds(f[FG.linkedProfiles]),
    lastSynced: str(f[FG.lastSynced]),
    hidden: bool(f[FG.hidden]),
  };
}

function mapPixel(r: AirtableRecord): InfraPixel {
  const f = r.fields;
  return {
    id: r.id,
    pixelId: str(f[FX.pixelId]),
    pixelName: str(f[FX.pixelName]),
    available: str(f[FX.available]),
    lastFiredTime: str(f[FX.lastFiredTime]),
    linkedBms: getLinkedIds(f[FX.linkedBms]),
    ownerBm: getLinkedIds(f[FX.ownerBm]),
    lastSynced: str(f[FX.lastSynced]),
    hidden: bool(f[FX.hidden]),
  };
}

// =============================================================================
// LIST OPERATIONS
// =============================================================================

export async function listProfiles(): Promise<InfraProfile[]> {
  const records = await fetchAllRecords(TABLES.profiles);
  return records.map(mapProfile);
}

export async function listBMs(): Promise<InfraBM[]> {
  const records = await fetchAllRecords(TABLES.bms);
  return records.map(mapBM);
}

export async function listAdAccounts(): Promise<InfraAdAccount[]> {
  const records = await fetchAllRecords(TABLES.adaccounts);
  return records.map(mapAdAccount);
}

export async function listPages(): Promise<InfraPage[]> {
  const records = await fetchAllRecords(TABLES.pages);
  return records.map(mapPage);
}

export async function listPixels(): Promise<InfraPixel[]> {
  const records = await fetchAllRecords(TABLES.pixels);
  return records.map(mapPixel);
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

export async function updateInfraRecord(
  table: keyof typeof TABLES,
  recordId: string,
  fields: Record<string, unknown>
): Promise<void> {
  await airtableFetch(`${TABLES[table]}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

export async function createInfraRecord(
  table: keyof typeof TABLES,
  fields: Record<string, unknown>
): Promise<{ id: string }> {
  const response = await airtableFetch(TABLES[table], {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  const data = await response.json();
  return { id: data.id };
}

export async function getInfraRecord(
  table: keyof typeof TABLES,
  recordId: string
): Promise<AirtableRecord> {
  const response = await airtableFetch(`${TABLES[table]}/${recordId}`);
  return response.json();
}
