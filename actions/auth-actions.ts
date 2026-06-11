"use server";

import { redirect } from "next/navigation";

import { createSession, clearSession } from "@/lib/session";
import { verifyPassword } from "@/lib/passwords";
import {
  findUserByUsername,
  updateLastLoginAt,
  type UserRole,
} from "@/lib/repositories/users";
import { createAuditLog } from "@/lib/repositories/audit-logs";

type LoginErrorCode = "missing_fields" | "invalid_credentials" | "disabled";

export async function loginAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      details: { username, reason: "missing_fields" },
    });
    redirectWithLoginError("missing_fields");
  }

  const user = await findUserByUsername(username);

  if (!user) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      details: { username, reason: "user_not_found" },
    });
    redirectWithLoginError("invalid_credentials");
  }

  if (!user.isActive) {
    await createAuditLog({
      userId: user.id,
      action: "LOGIN_FAILED",
      details: { username, reason: "disabled" },
    });
    redirectWithLoginError("disabled");
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    await createAuditLog({
      userId: user.id,
      action: "LOGIN_FAILED",
      details: { username, reason: "invalid_password" },
    });
    redirectWithLoginError("invalid_credentials");
  }

  await updateLastLoginAt(user.id);
  await createAuditLog({
    userId: user.id,
    action: "LOGIN_SUCCESS",
    details: { username, role: user.role },
  });
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
