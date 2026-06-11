import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

const SALT_ROUNDS = 12;
const SIMPLE_WORDS = [
  "sun",
  "river",
  "green",
  "mint",
  "paper",
  "stone",
  "rain",
  "desk",
  "chair",
  "map",
  "tree",
  "wind",
  "path",
  "cup",
  "fresh",
  "bright",
];
const SAFE_DIGITS = "23456789";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateEasyPassword(): string {
  const firstWord = SIMPLE_WORDS[randomInt(SIMPLE_WORDS.length)];
  const digit = SAFE_DIGITS[randomInt(SAFE_DIGITS.length)];
  const secondWord = SIMPLE_WORDS[randomInt(SIMPLE_WORDS.length)];

  return `${firstWord}${digit}${secondWord}`;
}

export function generateUsername(name?: string): string {
  const suffix = name ? randomInt(100, 1000) : randomInt(10000, 100000);
  const base = name
    ? name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "")
        .replace(/\.+/g, ".")
    : "scanner";

  return `${base || "scanner"}.${suffix}`;
}
