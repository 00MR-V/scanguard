import "server-only";

import { neon } from "@neondatabase/serverless";

export type AuditAction =
  | "USER_CREATED"
  | "USER_DISABLED"
  | "USER_ENABLED"
  | "USER_ROLE_CHANGED"
  | "PASSWORD_RESET"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "SCAN_SUCCESS"
  | "SCAN_DUPLICATE"
  | "EVENT_CREATED"
  | "EVENT_STATUS_CHANGED"
  | "EXPORT_SCANS"
  | "EXPORT_DUPLICATES";

export interface CreateAuditLogInput {
  userId?: string | null;
  action: AuditAction;
  details?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: AuditAction;
  details: Record<string, unknown> | null;
  createdAt: Date;
  username: string | null;
  fullName: string | null;
}

type AuditLogRow = {
  id: string;
  user_id: string | null;
  action: AuditAction;
  details: Record<string, unknown> | null;
  created_at: Date;
  username: string | null;
  full_name: string | null;
};

let cachedSql: ReturnType<typeof neon> | null = null;

export async function createAuditLog(
  input: CreateAuditLogInput,
): Promise<AuditLog> {
  const details = input.details ? JSON.stringify(input.details) : null;
  const rows = (await getSql()`
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (${input.userId ?? null}, ${input.action}, ${details}::jsonb)
    RETURNING
      id,
      user_id,
      action,
      details,
      created_at,
      NULL::text AS username,
      NULL::text AS full_name
  `) as AuditLogRow[];

  return mapAuditLog(rows[0]);
}

export async function listAuditLogs(limit = 100): Promise<AuditLog[]> {
  const safeLimit = normalizeLimit(limit);
  const rows = (await getSql()`
    SELECT
      audit_logs.id,
      audit_logs.user_id,
      audit_logs.action,
      audit_logs.details,
      audit_logs.created_at,
      users.username,
      users.full_name
    FROM audit_logs
    LEFT JOIN users ON users.id = audit_logs.user_id
    ORDER BY audit_logs.created_at DESC
    LIMIT ${safeLimit}
  `) as AuditLogRow[];

  return rows.map(mapAuditLog);
}

function getSql(): ReturnType<typeof neon> {
  if (!cachedSql) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required for audit log queries.");
    }

    cachedSql = neon(databaseUrl);
  }

  return cachedSql;
}

function mapAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    details: row.details,
    createdAt: row.created_at,
    username: row.username,
    fullName: row.full_name,
  };
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 100;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 500);
}
