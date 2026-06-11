import "server-only";

import { neon } from "@neondatabase/serverless";

export interface CreateScanInput {
  eventId: string;
  barcodeValue: string;
  scannedByUserId: string;
  deviceId?: string;
  location?: string;
}

export interface CreateDuplicateAttemptInput {
  eventId: string;
  barcodeValue: string;
  attemptedByUserId: string;
  originalScanId?: string;
  deviceId?: string;
  location?: string;
}

export interface Scan {
  id: string;
  eventId: string;
  barcodeValue: string;
  scannedByUserId: string;
  scannedAt: Date;
  deviceId: string | null;
  location: string | null;
}

export interface OriginalScan extends Scan {
  scannedByUsername: string;
  scannedByFullName: string | null;
}

export interface DuplicateAttempt {
  id: string;
  eventId: string;
  barcodeValue: string;
  attemptedByUserId: string;
  attemptedAt: Date;
  originalScanId: string | null;
  deviceId: string | null;
  location: string | null;
}

export interface RecentScan extends OriginalScan {
  eventName: string;
}

export interface RecentDuplicate extends DuplicateAttempt {
  eventName: string;
  attemptedByUsername: string;
  attemptedByFullName: string | null;
}

export interface ScanStats {
  totalScans: number;
  totalDuplicateAttempts: number;
}

export interface SearchScansInput {
  barcodeValue?: string;
  scannerUsername?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface SearchDuplicateAttemptsInput {
  barcodeValue?: string;
  scannerUsername?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface SearchScanResult extends OriginalScan {
  eventName: string;
}

export interface SearchDuplicateAttemptResult extends DuplicateAttempt {
  eventName: string;
  originalScannedByUsername: string | null;
  originalScannedByFullName: string | null;
  originalScannedAt: Date | null;
  attemptedByUsername: string;
  attemptedByFullName: string | null;
}

type ScanRow = {
  id: string;
  event_id: string;
  barcode_value: string;
  scanned_by_user_id: string;
  scanned_at: Date;
  device_id: string | null;
  location: string | null;
};

type OriginalScanRow = ScanRow & {
  scanned_by_username: string;
  scanned_by_full_name: string | null;
};

type RecentScanRow = OriginalScanRow & {
  event_name: string;
};

type DuplicateAttemptRow = {
  id: string;
  event_id: string;
  barcode_value: string;
  attempted_by_user_id: string;
  attempted_at: Date;
  original_scan_id: string | null;
  device_id: string | null;
  location: string | null;
};

type RecentDuplicateRow = DuplicateAttemptRow & {
  event_name: string;
  attempted_by_username: string;
  attempted_by_full_name: string | null;
};

type SearchDuplicateAttemptRow = RecentDuplicateRow & {
  original_scanned_by_username: string | null;
  original_scanned_by_full_name: string | null;
  original_scanned_at: Date | null;
};

type ScanStatsRow = {
  total_scans: string;
  total_duplicate_attempts: string;
};

let cachedSql: ReturnType<typeof neon> | null = null;

export async function createScan(input: CreateScanInput): Promise<Scan> {
  const rows = (await getSql()`
    INSERT INTO scans (
      event_id,
      barcode_value,
      scanned_by_user_id,
      device_id,
      location
    )
    VALUES (
      ${input.eventId},
      ${input.barcodeValue},
      ${input.scannedByUserId},
      ${input.deviceId ?? null},
      ${input.location ?? null}
    )
    RETURNING
      id,
      event_id,
      barcode_value,
      scanned_by_user_id,
      scanned_at,
      device_id,
      location
  `) as ScanRow[];

  return mapScan(rows[0]);
}

export async function findOriginalScan(
  eventId: string,
  barcodeValue: string,
): Promise<OriginalScan | null> {
  const rows = (await getSql()`
    SELECT
      scans.id,
      scans.event_id,
      scans.barcode_value,
      scans.scanned_by_user_id,
      scans.scanned_at,
      scans.device_id,
      scans.location,
      users.username AS scanned_by_username,
      users.full_name AS scanned_by_full_name
    FROM scans
    INNER JOIN users ON users.id = scans.scanned_by_user_id
    WHERE scans.event_id = ${eventId}
      AND scans.barcode_value = ${barcodeValue}
    LIMIT 1
  `) as OriginalScanRow[];

  return rows[0] ? mapOriginalScan(rows[0]) : null;
}

export async function createDuplicateAttempt(
  input: CreateDuplicateAttemptInput,
): Promise<DuplicateAttempt> {
  const rows = (await getSql()`
    INSERT INTO duplicate_scan_attempts (
      event_id,
      barcode_value,
      attempted_by_user_id,
      original_scan_id,
      device_id,
      location
    )
    VALUES (
      ${input.eventId},
      ${input.barcodeValue},
      ${input.attemptedByUserId},
      ${input.originalScanId ?? null},
      ${input.deviceId ?? null},
      ${input.location ?? null}
    )
    RETURNING
      id,
      event_id,
      barcode_value,
      attempted_by_user_id,
      attempted_at,
      original_scan_id,
      device_id,
      location
  `) as DuplicateAttemptRow[];

  return mapDuplicateAttempt(rows[0]);
}

export async function listRecentScans(limit = 50): Promise<RecentScan[]> {
  const safeLimit = normalizeLimit(limit);
  const rows = (await getSql()`
    SELECT
      scans.id,
      scans.event_id,
      scans.barcode_value,
      scans.scanned_by_user_id,
      scans.scanned_at,
      scans.device_id,
      scans.location,
      users.username AS scanned_by_username,
      users.full_name AS scanned_by_full_name,
      events.name AS event_name
    FROM scans
    INNER JOIN users ON users.id = scans.scanned_by_user_id
    INNER JOIN events ON events.id = scans.event_id
    ORDER BY scans.scanned_at DESC
    LIMIT ${safeLimit}
  `) as RecentScanRow[];

  return rows.map(mapRecentScan);
}

export async function listRecentDuplicates(
  limit = 50,
): Promise<RecentDuplicate[]> {
  const safeLimit = normalizeLimit(limit);
  const rows = (await getSql()`
    SELECT
      duplicate_scan_attempts.id,
      duplicate_scan_attempts.event_id,
      duplicate_scan_attempts.barcode_value,
      duplicate_scan_attempts.attempted_by_user_id,
      duplicate_scan_attempts.attempted_at,
      duplicate_scan_attempts.original_scan_id,
      duplicate_scan_attempts.device_id,
      duplicate_scan_attempts.location,
      users.username AS attempted_by_username,
      users.full_name AS attempted_by_full_name,
      events.name AS event_name
    FROM duplicate_scan_attempts
    INNER JOIN users ON users.id = duplicate_scan_attempts.attempted_by_user_id
    INNER JOIN events ON events.id = duplicate_scan_attempts.event_id
    ORDER BY duplicate_scan_attempts.attempted_at DESC
    LIMIT ${safeLimit}
  `) as RecentDuplicateRow[];

  return rows.map(mapRecentDuplicate);
}

export async function getScanStats(eventId: string): Promise<ScanStats> {
  const rows = (await getSql()`
    SELECT
      (
        SELECT COUNT(*)
        FROM scans
        WHERE event_id = ${eventId}
      ) AS total_scans,
      (
        SELECT COUNT(*)
        FROM duplicate_scan_attempts
        WHERE event_id = ${eventId}
      ) AS total_duplicate_attempts
  `) as ScanStatsRow[];

  return {
    totalScans: Number(rows[0]?.total_scans ?? 0),
    totalDuplicateAttempts: Number(rows[0]?.total_duplicate_attempts ?? 0),
  };
}

export async function searchScans(
  input: SearchScansInput,
): Promise<SearchScanResult[]> {
  const barcodeValue = normalizeSearchValue(input.barcodeValue);
  const scannerUsername = normalizeSearchValue(input.scannerUsername);
  const dateFrom = normalizeDateValue(input.dateFrom);
  const dateTo = normalizeDateValue(input.dateTo);
  const limit = normalizeLimit(input.limit ?? 50, 200);
  const offset = normalizeOffset(input.offset);
  const rows = (await getSql()`
    SELECT
      scans.id,
      scans.event_id,
      scans.barcode_value,
      scans.scanned_by_user_id,
      scans.scanned_at,
      scans.device_id,
      scans.location,
      users.username AS scanned_by_username,
      users.full_name AS scanned_by_full_name,
      events.name AS event_name
    FROM scans
    INNER JOIN users ON users.id = scans.scanned_by_user_id
    INNER JOIN events ON events.id = scans.event_id
    WHERE (${barcodeValue}::text IS NULL OR scans.barcode_value ILIKE '%' || ${barcodeValue} || '%')
      AND (${scannerUsername}::text IS NULL OR users.username ILIKE '%' || ${scannerUsername} || '%')
      AND (${dateFrom}::timestamptz IS NULL OR scans.scanned_at >= ${dateFrom}::timestamptz)
      AND (${dateTo}::timestamptz IS NULL OR scans.scanned_at <= ${dateTo}::timestamptz)
    ORDER BY scans.scanned_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `) as RecentScanRow[];

  return rows.map(mapRecentScan);
}

export async function searchDuplicateAttempts(
  input: SearchDuplicateAttemptsInput,
): Promise<SearchDuplicateAttemptResult[]> {
  const barcodeValue = normalizeSearchValue(input.barcodeValue);
  const scannerUsername = normalizeSearchValue(input.scannerUsername);
  const dateFrom = normalizeDateValue(input.dateFrom);
  const dateTo = normalizeDateValue(input.dateTo);
  const limit = normalizeLimit(input.limit ?? 50, 200);
  const offset = normalizeOffset(input.offset);
  const rows = (await getSql()`
    SELECT
      duplicate_scan_attempts.id,
      duplicate_scan_attempts.event_id,
      duplicate_scan_attempts.barcode_value,
      duplicate_scan_attempts.attempted_by_user_id,
      duplicate_scan_attempts.attempted_at,
      duplicate_scan_attempts.original_scan_id,
      duplicate_scan_attempts.device_id,
      duplicate_scan_attempts.location,
      events.name AS event_name,
      attempted_users.username AS attempted_by_username,
      attempted_users.full_name AS attempted_by_full_name,
      original_users.username AS original_scanned_by_username,
      original_users.full_name AS original_scanned_by_full_name,
      scans.scanned_at AS original_scanned_at
    FROM duplicate_scan_attempts
    INNER JOIN users AS attempted_users
      ON attempted_users.id = duplicate_scan_attempts.attempted_by_user_id
    INNER JOIN events ON events.id = duplicate_scan_attempts.event_id
    LEFT JOIN scans ON scans.id = duplicate_scan_attempts.original_scan_id
    LEFT JOIN users AS original_users ON original_users.id = scans.scanned_by_user_id
    WHERE (${barcodeValue}::text IS NULL OR duplicate_scan_attempts.barcode_value ILIKE '%' || ${barcodeValue} || '%')
      AND (${scannerUsername}::text IS NULL OR attempted_users.username ILIKE '%' || ${scannerUsername} || '%')
      AND (${dateFrom}::timestamptz IS NULL OR duplicate_scan_attempts.attempted_at >= ${dateFrom}::timestamptz)
      AND (${dateTo}::timestamptz IS NULL OR duplicate_scan_attempts.attempted_at <= ${dateTo}::timestamptz)
    ORDER BY duplicate_scan_attempts.attempted_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `) as SearchDuplicateAttemptRow[];

  return rows.map(mapSearchDuplicateAttempt);
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function getSql(): ReturnType<typeof neon> {
  if (!cachedSql) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required for scan repository queries.");
    }

    cachedSql = neon(databaseUrl);
  }

  return cachedSql;
}

function mapScan(row: ScanRow): Scan {
  return {
    id: row.id,
    eventId: row.event_id,
    barcodeValue: row.barcode_value,
    scannedByUserId: row.scanned_by_user_id,
    scannedAt: row.scanned_at,
    deviceId: row.device_id,
    location: row.location,
  };
}

function mapOriginalScan(row: OriginalScanRow): OriginalScan {
  return {
    ...mapScan(row),
    scannedByUsername: row.scanned_by_username,
    scannedByFullName: row.scanned_by_full_name,
  };
}

function mapDuplicateAttempt(row: DuplicateAttemptRow): DuplicateAttempt {
  return {
    id: row.id,
    eventId: row.event_id,
    barcodeValue: row.barcode_value,
    attemptedByUserId: row.attempted_by_user_id,
    attemptedAt: row.attempted_at,
    originalScanId: row.original_scan_id,
    deviceId: row.device_id,
    location: row.location,
  };
}

function mapRecentScan(row: RecentScanRow): RecentScan {
  return {
    ...mapOriginalScan(row),
    eventName: row.event_name,
  };
}

function mapRecentDuplicate(row: RecentDuplicateRow): RecentDuplicate {
  return {
    ...mapDuplicateAttempt(row),
    eventName: row.event_name,
    attemptedByUsername: row.attempted_by_username,
    attemptedByFullName: row.attempted_by_full_name,
  };
}

function mapSearchDuplicateAttempt(
  row: SearchDuplicateAttemptRow,
): SearchDuplicateAttemptResult {
  return {
    ...mapRecentDuplicate(row),
    originalScannedByUsername: row.original_scanned_by_username,
    originalScannedByFullName: row.original_scanned_by_full_name,
    originalScannedAt: row.original_scanned_at,
  };
}

function normalizeLimit(limit: number, maxLimit = 100): number {
  if (!Number.isFinite(limit)) {
    return 50;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), maxLimit);
}

function normalizeOffset(offset?: number): number {
  if (!offset || !Number.isFinite(offset)) {
    return 0;
  }

  return Math.max(Math.trunc(offset), 0);
}

function normalizeSearchValue(value?: string): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function normalizeDateValue(value?: string): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}
