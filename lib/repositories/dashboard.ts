import "server-only";

import { neon } from "@neondatabase/serverless";

export interface DashboardStats {
  totalValidScans: number;
  totalDuplicateAttempts: number;
  activeScannerUsers: number;
  lastScanAt: Date | null;
  scansLast15Minutes: number;
  scansLastHour: number;
  recentDuplicateAttempts: RecentDuplicateAttempt[];
}

export interface RecentScanActivity {
  id: string;
  barcodeValue: string;
  scannedAt: Date;
  scannerUsername: string;
  scannerFullName: string | null;
  deviceId: string | null;
  location: string | null;
}

export interface RecentDuplicateAttempt {
  id: string;
  barcodeValue: string;
  attemptedAt: Date;
  attemptedByUsername: string;
  attemptedByFullName: string | null;
  originalScanId: string | null;
  deviceId: string | null;
  location: string | null;
}

export interface TopScanner {
  userId: string;
  username: string;
  fullName: string | null;
  scanCount: number;
  lastScanAt: Date | null;
}

type DashboardStatsRow = {
  total_valid_scans: string;
  total_duplicate_attempts: string;
  active_scanner_users: string;
  last_scan_at: Date | null;
  scans_last_15_minutes: string;
  scans_last_hour: string;
};

type RecentScanActivityRow = {
  id: string;
  barcode_value: string;
  scanned_at: Date;
  scanner_username: string;
  scanner_full_name: string | null;
  device_id: string | null;
  location: string | null;
};

type RecentDuplicateAttemptRow = {
  id: string;
  barcode_value: string;
  attempted_at: Date;
  attempted_by_username: string;
  attempted_by_full_name: string | null;
  original_scan_id: string | null;
  device_id: string | null;
  location: string | null;
};

type TopScannerRow = {
  user_id: string;
  username: string;
  full_name: string | null;
  scan_count: string;
  last_scan_at: Date | null;
};

let cachedSql: ReturnType<typeof neon> | null = null;

export async function getDashboardStats(
  eventId: string,
): Promise<DashboardStats> {
  const rows = (await getSql()`
    SELECT
      (
        SELECT COUNT(*)
        FROM scans
        WHERE event_id = ${eventId}
      ) AS total_valid_scans,
      (
        SELECT COUNT(*)
        FROM duplicate_scan_attempts
        WHERE event_id = ${eventId}
      ) AS total_duplicate_attempts,
      (
        SELECT COUNT(*)
        FROM users
        WHERE role = 'SCANNER'
          AND is_active = TRUE
      ) AS active_scanner_users,
      (
        SELECT MAX(scanned_at)
        FROM scans
        WHERE event_id = ${eventId}
      ) AS last_scan_at,
      (
        SELECT COUNT(*)
        FROM scans
        WHERE event_id = ${eventId}
          AND scanned_at >= NOW() - INTERVAL '15 minutes'
      ) AS scans_last_15_minutes,
      (
        SELECT COUNT(*)
        FROM scans
        WHERE event_id = ${eventId}
          AND scanned_at >= NOW() - INTERVAL '1 hour'
      ) AS scans_last_hour
  `) as DashboardStatsRow[];
  const row = rows[0];

  return {
    totalValidScans: Number(row?.total_valid_scans ?? 0),
    totalDuplicateAttempts: Number(row?.total_duplicate_attempts ?? 0),
    activeScannerUsers: Number(row?.active_scanner_users ?? 0),
    lastScanAt: row?.last_scan_at ?? null,
    scansLast15Minutes: Number(row?.scans_last_15_minutes ?? 0),
    scansLastHour: Number(row?.scans_last_hour ?? 0),
    recentDuplicateAttempts: await getRecentDuplicateAttempts(eventId, 20),
  };
}

export async function getRecentScanActivity(
  eventId: string,
  limit = 20,
): Promise<RecentScanActivity[]> {
  const safeLimit = normalizeLimit(limit);
  const rows = (await getSql()`
    SELECT
      scans.id,
      scans.barcode_value,
      scans.scanned_at,
      scans.device_id,
      scans.location,
      users.username AS scanner_username,
      users.full_name AS scanner_full_name
    FROM scans
    INNER JOIN users ON users.id = scans.scanned_by_user_id
    WHERE scans.event_id = ${eventId}
    ORDER BY scans.scanned_at DESC
    LIMIT ${safeLimit}
  `) as RecentScanActivityRow[];

  return rows.map(mapRecentScanActivity);
}

export async function getTopScanners(
  eventId: string,
  limit = 10,
): Promise<TopScanner[]> {
  const safeLimit = normalizeLimit(limit);
  const rows = (await getSql()`
    SELECT
      users.id AS user_id,
      users.username,
      users.full_name,
      COUNT(scans.id) AS scan_count,
      MAX(scans.scanned_at) AS last_scan_at
    FROM scans
    INNER JOIN users ON users.id = scans.scanned_by_user_id
    WHERE scans.event_id = ${eventId}
    GROUP BY users.id, users.username, users.full_name
    ORDER BY scan_count DESC, last_scan_at DESC
    LIMIT ${safeLimit}
  `) as TopScannerRow[];

  return rows.map(mapTopScanner);
}

async function getRecentDuplicateAttempts(
  eventId: string,
  limit: number,
): Promise<RecentDuplicateAttempt[]> {
  const safeLimit = normalizeLimit(limit);
  const rows = (await getSql()`
    SELECT
      duplicate_scan_attempts.id,
      duplicate_scan_attempts.barcode_value,
      duplicate_scan_attempts.attempted_at,
      duplicate_scan_attempts.original_scan_id,
      duplicate_scan_attempts.device_id,
      duplicate_scan_attempts.location,
      users.username AS attempted_by_username,
      users.full_name AS attempted_by_full_name
    FROM duplicate_scan_attempts
    INNER JOIN users ON users.id = duplicate_scan_attempts.attempted_by_user_id
    WHERE duplicate_scan_attempts.event_id = ${eventId}
    ORDER BY duplicate_scan_attempts.attempted_at DESC
    LIMIT ${safeLimit}
  `) as RecentDuplicateAttemptRow[];

  return rows.map(mapRecentDuplicateAttempt);
}

function getSql(): ReturnType<typeof neon> {
  if (!cachedSql) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required for dashboard queries.");
    }

    cachedSql = neon(databaseUrl);
  }

  return cachedSql;
}

function mapRecentScanActivity(
  row: RecentScanActivityRow,
): RecentScanActivity {
  return {
    id: row.id,
    barcodeValue: row.barcode_value,
    scannedAt: row.scanned_at,
    scannerUsername: row.scanner_username,
    scannerFullName: row.scanner_full_name,
    deviceId: row.device_id,
    location: row.location,
  };
}

function mapRecentDuplicateAttempt(
  row: RecentDuplicateAttemptRow,
): RecentDuplicateAttempt {
  return {
    id: row.id,
    barcodeValue: row.barcode_value,
    attemptedAt: row.attempted_at,
    attemptedByUsername: row.attempted_by_username,
    attemptedByFullName: row.attempted_by_full_name,
    originalScanId: row.original_scan_id,
    deviceId: row.device_id,
    location: row.location,
  };
}

function mapTopScanner(row: TopScannerRow): TopScanner {
  return {
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    scanCount: Number(row.scan_count),
    lastScanAt: row.last_scan_at,
  };
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}
