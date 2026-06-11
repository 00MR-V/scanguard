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

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 50;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}
