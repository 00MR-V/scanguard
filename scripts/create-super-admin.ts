import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { neon } from "@neondatabase/serverless";

import { hashPassword } from "../lib/passwords";

type CliArgs = {
  username?: string;
  fullName?: string;
  password?: string;
};

type ExistingUserRow = {
  id: string;
};

type CreatedUserRow = {
  id: string;
  username: string;
  full_name: string | null;
};

loadEnvLocal();

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Add it to .env.local first.");
  }

  const rl = readline.createInterface({ input, output });

  try {
    const username = normalizeUsername(
      args.username ?? (await rl.question("Username: ")),
    );
    const fullName =
      args.fullName ?? (await rl.question("Full name: "));
    const password = args.password ?? (await rl.question("Password: "));

    if (!username) {
      throw new Error("Username is required.");
    }

    if (!password) {
      throw new Error("Password is required.");
    }

    const sql = neon(databaseUrl);
    const existingUsers = (await sql`
      SELECT id
      FROM users
      WHERE username = ${username}
      LIMIT 1
    `) as ExistingUserRow[];

    if (existingUsers.length > 0) {
      throw new Error(`User "${username}" already exists.`);
    }

    const passwordHash = await hashPassword(password);
    const createdUsers = (await sql`
      INSERT INTO users (username, password_hash, full_name, role, is_active)
      VALUES (${username}, ${passwordHash}, ${fullName.trim() || null}, 'SUPER_ADMIN', TRUE)
      RETURNING id, username, full_name
    `) as CreatedUserRow[];

    const createdUser = createdUsers[0];
    console.log(
      `Created SUPER_ADMIN user "${createdUser.username}" (${createdUser.id}).`,
    );
  } finally {
    rl.close();
  }
}

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;

    if (process.env[key]) {
      continue;
    }

    process.env[key] = parseEnvValue(rawValue);
  }
}

function parseEnvValue(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseArgs(args: string[]): CliArgs {
  const parsed: CliArgs = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === "--username" && nextValue) {
      parsed.username = nextValue;
      index += 1;
    } else if (arg === "--full-name" && nextValue) {
      parsed.fullName = nextValue;
      index += 1;
    } else if (arg === "--password" && nextValue) {
      parsed.password = nextValue;
      index += 1;
    }
  }

  return parsed;
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";

  console.error(`Failed to create super admin: ${message}`);
  process.exit(1);
});
