import "server-only";

import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/session";
import {
  findUserById,
  type User,
  type UserRole,
} from "@/lib/repositories/users";

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  const user = await findUserById(userId);

  if (!user?.isActive) {
    return null;
  }

  return user;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(roles: UserRole[]): Promise<User> {
  const user = await requireAuth();

  if (!roles.includes(user.role)) {
    redirect(getRoleHomePath(user.role));
  }

  return user;
}

function getRoleHomePath(role: UserRole): string {
  if (role === "SCANNER") {
    return "/scan";
  }

  return "/admin/dashboard";
}
