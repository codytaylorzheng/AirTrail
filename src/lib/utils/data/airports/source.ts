import { find } from 'geo-tz';
import { sql } from 'kysely';

import { db } from '$lib/db';
import type { Airport } from '$lib/db/types';
import { parseCsv } from '$lib/utils';
import { deepEqual } from '$lib/utils/other';
import { airportSourceSchema } from '$lib/zod/airport';

export const BATCH_SIZE = 1000;

/**
 * Manual timezone overrides for airports where geo-tz returns incorrect results.
 */
const TIMEZONE_OVERRIDES: Record<string, string> = {
  YBCG: 'Australia/Brisbane', // Gold Coast (OOL)
};

/**
 * FIXED: Disables the automatic check for airports.
 * This prevents the app from crashing on Render by skipping the 85k-row comparison.
 */
export const ensureAirports = async () => {
  console.log('Skipping airport population check - database is manually managed via Supabase.');
  return;
};

/**
 * Stubbed out to prevent accidental triggers.
 */
export const updateAirports = async () => {
  console.log('Update skipped to save memory.');
  return {
    created: 0,
    updated: 0,
    removed: 0,
    retained: 0,
    time: 0,
  };
};

/**
 * Stubbed out to prevent large external fetches.
 */
export const fetchAirports = async (): Promise<InsertAirport[]> => {
  return [];
};

/**
 * Placeholder to satisfy type requirements.
 */
const fillCodesFromKeywords = (
  airports: InsertAirport[],
  keywordsByIndex: (string | null)[],
) => {
  return;
};

type InsertAirport = Omit<Airport, 'id'>;