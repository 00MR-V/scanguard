import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

type DuplicateExportRow = {
  barcode_value: string;
  original_scanned_by: string | null;
  original_scanned_at: Date | null;
  duplicate_attempted_by: string;
  duplicate_attempted_at: Date;
  device_id: string | null;
  location: string | null;
};

const CSV_HEADERS = [
  "barcode_value",
  "original_scanned_by",
  "original_scanned_at",
  "duplicate_attempted_by",
  "duplicate_attempted_at",
  "device_id",
  "location",
];

export async function GET() {
  const authResponse = await requireAdminExportAccess();

  if (authResponse) {
    return authResponse;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return new NextResponse("DATABASE_URL is not configured.", { status: 500 });
  }

  const sql = neon(databaseUrl);
  const rows = (await sql`
    SELECT
      duplicate_scan_attempts.barcode_value,
      COALESCE(original_users.full_name, original_users.username) AS original_scanned_by,
      scans.scanned_at AS original_scanned_at,
      COALESCE(attempted_users.full_name, attempted_users.username) AS duplicate_attempted_by,
      duplicate_scan_attempts.attempted_at AS duplicate_attempted_at,
      duplicate_scan_attempts.device_id,
      duplicate_scan_attempts.location
    FROM duplicate_scan_attempts
    INNER JOIN users AS attempted_users
      ON attempted_users.id = duplicate_scan_attempts.attempted_by_user_id
    LEFT JOIN scans ON scans.id = duplicate_scan_attempts.original_scan_id
    LEFT JOIN users AS original_users ON original_users.id = scans.scanned_by_user_id
    ORDER BY duplicate_scan_attempts.attempted_at DESC
  `) as DuplicateExportRow[];

  return createCsvResponse(
    CSV_HEADERS,
    rows.map((row) => [
      row.barcode_value,
      row.original_scanned_by,
      row.original_scanned_at?.toISOString() ?? null,
      row.duplicate_attempted_by,
      row.duplicate_attempted_at.toISOString(),
      row.device_id,
      row.location,
    ]),
    `scanguard-duplicates-${getDateStamp()}.csv`,
  );
}

async function requireAdminExportAccess(): Promise<NextResponse | null> {
  const user = await getCurrentUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return null;
}

function createCsvResponse(
  headers: string[],
  rows: Array<Array<string | null>>,
  filename: string,
): NextResponse {
  const csv = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\r\n");

  return new NextResponse(`${csv}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function escapeCsvValue(value: string | null): string {
  const safeValue = value ?? "";

  if (
    safeValue.includes(",") ||
    safeValue.includes('"') ||
    safeValue.includes("\n") ||
    safeValue.includes("\r")
  ) {
    return `"${safeValue.replaceAll('"', '""')}"`;
  }

  return safeValue;
}

function getDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
