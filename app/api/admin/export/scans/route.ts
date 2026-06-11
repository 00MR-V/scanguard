import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

type ScanExportRow = {
  barcode_value: string;
  scanned_by_username: string;
  scanned_by_name: string | null;
  scanned_at: Date;
  device_id: string | null;
  location: string | null;
};

const CSV_HEADERS = [
  "barcode_value",
  "scanned_by_username",
  "scanned_by_name",
  "scanned_at",
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
      scans.barcode_value,
      users.username AS scanned_by_username,
      users.full_name AS scanned_by_name,
      scans.scanned_at,
      scans.device_id,
      scans.location
    FROM scans
    INNER JOIN users ON users.id = scans.scanned_by_user_id
    ORDER BY scans.scanned_at DESC
  `) as ScanExportRow[];

  return createCsvResponse(
    CSV_HEADERS,
    rows.map((row) => [
      row.barcode_value,
      row.scanned_by_username,
      row.scanned_by_name,
      row.scanned_at.toISOString(),
      row.device_id,
      row.location,
    ]),
    `scanguard-scans-${getDateStamp()}.csv`,
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
