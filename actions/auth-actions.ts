"use server";

import { redirect } from "next/navigation";

import { createSession, clearSession } from "@/lib/session";
import { verifyPassword } from "@/lib/passwords";
import {
  findUserByUsername,
  updateLastLoginAt,
  type UserRole,
} from "@/lib/repositories/users";

type LoginErrorCode = "missing_fields" | "invalid_credentials" | "disabled";

export async function loginAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    redirectWithLoginError("missing_fields");
  }

  const user = await findUserByUsername(username);

  if (!user) {
    redirectWithLoginError("invalid_credentials");
  }

  if (!user.isActive) {
    redirectWithLoginError("disabled");
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    redirectWithLoginError("invalid_credentials");
  }

  await updateLastLoginAt(user.id);
  await createSession(user.id);

  redirect(getPostLoginPath(user.role));
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}

function redirectWithLoginError(error: LoginErrorCode): never {
  redirect(`/login?error=${error}`);
}

function getPostLoginPath(role: UserRole): string {
  if (role === "SCANNER") {
    return "/scan";
  }

  return "/admin/dashboard";
}
