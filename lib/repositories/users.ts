import "server-only";

import { neon } from "@neondatabase/serverless";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "SCANNER";

export interface CreateUserInput {
  username: string;
  passwordHash: string;
  fullName?: string;
  role: UserRole;
}

export interface User {
  id: string;
  username: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface UserWithPasswordHash extends User {
  passwordHash: string;
}

type UserRow = {
  id: string;
  username: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  last_login_at: Date | null;
};

type UserWithPasswordHashRow = UserRow & {
  password_hash: string;
};

let cachedSql: ReturnType<typeof neon> | null = null;

export async function findUserByUsername(
  username: string,
): Promise<UserWithPasswordHash | null> {
  const normalizedUsername = normalizeUsername(username);
  const rows = (await getSql()`
    SELECT
      id,
      username,
      password_hash,
      full_name,
      role,
      is_active,
      created_at,
      last_login_at
    FROM users
    WHERE username = ${normalizedUsername}
    LIMIT 1
  `) as UserWithPasswordHashRow[];

  return rows[0] ? mapUserWithPasswordHash(rows[0]) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const rows = (await getSql()`
    SELECT
      id,
      username,
      full_name,
      role,
      is_active,
      created_at,
      last_login_at
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `) as UserRow[];

  return rows[0] ? mapUser(rows[0]) : null;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const normalizedUsername = normalizeUsername(input.username);

  try {
    const rows = (await getSql()`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES (
        ${normalizedUsername},
        ${input.passwordHash},
        ${input.fullName ?? null},
        ${input.role}
      )
      RETURNING
        id,
        username,
        full_name,
        role,
        is_active,
        created_at,
        last_login_at
    `) as UserRow[];

    return mapUser(rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error(`Username "${normalizedUsername}" is already in use.`);
    }

    throw error;
  }
}

export async function listUsers(): Promise<User[]> {
  const rows = (await getSql()`
    SELECT
      id,
      username,
      full_name,
      role,
      is_active,
      created_at,
      last_login_at
    FROM users
    ORDER BY created_at DESC
  `) as UserRow[];

  return rows.map(mapUser);
}

export async function updateUserActiveStatus(
  userId: string,
  isActive: boolean,
): Promise<User | null> {
  const rows = (await getSql()`
    UPDATE users
    SET is_active = ${isActive}
    WHERE id = ${userId}
    RETURNING
      id,
      username,
      full_name,
      role,
      is_active,
      created_at,
      last_login_at
  `) as UserRow[];

  return rows[0] ? mapUser(rows[0]) : null;
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
): Promise<User | null> {
  const rows = (await getSql()`
    UPDATE users
    SET password_hash = ${passwordHash}
    WHERE id = ${userId}
    RETURNING
      id,
      username,
      full_name,
      role,
      is_active,
      created_at,
      last_login_at
  `) as UserRow[];

  return rows[0] ? mapUser(rows[0]) : null;
}

export async function updateLastLoginAt(userId: string): Promise<User | null> {
  const rows = (await getSql()`
    UPDATE users
    SET last_login_at = NOW()
    WHERE id = ${userId}
    RETURNING
      id,
      username,
      full_name,
      role,
      is_active,
      created_at,
      last_login_at
  `) as UserRow[];

  return rows[0] ? mapUser(rows[0]) : null;
}

function getSql(): ReturnType<typeof neon> {
  if (!cachedSql) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required for user repository queries.");
    }

    cachedSql = neon(databaseUrl);
  }

  return cachedSql;
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

function mapUserWithPasswordHash(row: UserWithPasswordHashRow): UserWithPasswordHash {
  return {
    ...mapUser(row),
    passwordHash: row.password_hash,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
