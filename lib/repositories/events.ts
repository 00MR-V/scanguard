import "server-only";

import { neon } from "@neondatabase/serverless";

export type EventStatus = "DRAFT" | "ACTIVE" | "CLOSED";

export interface CreateEventInput {
  name: string;
  description?: string;
}

export interface Event {
  id: string;
  name: string;
  description: string | null;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

type EventRow = {
  id: string;
  name: string;
  description: string | null;
  status: EventStatus;
  created_at: Date;
  updated_at: Date;
};

let cachedSql: ReturnType<typeof neon> | null = null;

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const rows = (await getSql()`
    INSERT INTO events (name, description)
    VALUES (${input.name.trim()}, ${input.description?.trim() || null})
    RETURNING
      id,
      name,
      description,
      status,
      created_at,
      updated_at
  `) as EventRow[];

  return mapEvent(rows[0]);
}

export async function listEvents(): Promise<Event[]> {
  const rows = (await getSql()`
    SELECT
      id,
      name,
      description,
      status,
      created_at,
      updated_at
    FROM events
    ORDER BY created_at DESC
  `) as EventRow[];

  return rows.map(mapEvent);
}

export async function findEventById(eventId: string): Promise<Event | null> {
  const rows = (await getSql()`
    SELECT
      id,
      name,
      description,
      status,
      created_at,
      updated_at
    FROM events
    WHERE id = ${eventId}
    LIMIT 1
  `) as EventRow[];

  return rows[0] ? mapEvent(rows[0]) : null;
}

export async function getActiveEvent(): Promise<Event | null> {
  const rows = (await getSql()`
    SELECT
      id,
      name,
      description,
      status,
      created_at,
      updated_at
    FROM events
    WHERE status = 'ACTIVE'
    ORDER BY created_at DESC
    LIMIT 1
  `) as EventRow[];

  return rows[0] ? mapEvent(rows[0]) : null;
}

export async function updateEventStatus(
  eventId: string,
  status: EventStatus,
): Promise<Event | null> {
  const rows = (await getSql()`
    UPDATE events
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${eventId}
    RETURNING
      id,
      name,
      description,
      status,
      created_at,
      updated_at
  `) as EventRow[];

  return rows[0] ? mapEvent(rows[0]) : null;
}

function getSql(): ReturnType<typeof neon> {
  if (!cachedSql) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required for event repository queries.");
    }

    cachedSql = neon(databaseUrl);
  }

  return cachedSql;
}

function mapEvent(row: EventRow): Event {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
