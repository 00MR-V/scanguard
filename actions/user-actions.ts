"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import {
  createUser,
  findUserById,
  updateUserRole,
  updateUserActiveStatus,
  updateUserPassword,
  type UserRole,
} from "@/lib/repositories/users";
import { formatRole, USER_ROLES } from "@/lib/user-roles";
import {
  generateEasyPassword,
  generateUsername,
  hashPassword,
} from "@/lib/passwords";
import { createAuditLog } from "@/lib/repositories/audit-logs";

export type CreateUserState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message?: string;
  createdUsername?: string;
  generatedPassword?: string;
};

export type UserActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message?: string;
  generatedPassword?: string;
};

export async function createUserAction(
  _previousState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const actor = await requireRole(["SUPER_ADMIN"]);

  const fullName = getOptionalString(formData, "fullName");
  const username = getRequiredString(formData, "username").toLowerCase();
  const password = getRequiredString(formData, "password");
  const role = getUserRole(formData);

  if (!username || !password || !role) {
    return {
      status: "ERROR",
      message: "Username, password, and role are required.",
    };
  }

  try {
    const createdUser = await createUser({
      username,
      passwordHash: await hashPassword(password),
      fullName,
      role,
    });
    await createAuditLog({
      userId: actor.id,
      action: "USER_CREATED",
      details: {
        userId: createdUser.id,
        username: createdUser.username,
        role: createdUser.role,
      },
    });

    revalidatePath("/admin/users");

    return {
      status: "SUCCESS",
      message: `Created user "${username}".`,
      createdUsername: createdUser.username,
      generatedPassword: password,
    };
  } catch (error) {
    return {
      status: "ERROR",
      message:
        error instanceof Error ? error.message : "Could not create user.",
    };
  }
}

export async function updateUserActiveStatusAction(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const actor = await requireRole(["SUPER_ADMIN"]);

  const userId = getRequiredString(formData, "userId");
  const isActive = getRequiredString(formData, "isActive") === "true";

  if (!userId) {
    return {
      status: "ERROR",
      message: "User ID is required.",
    };
  }

  const updatedUser = await updateUserActiveStatus(userId, isActive);

  if (!updatedUser) {
    return {
      status: "ERROR",
      message: "User was not found.",
    };
  }

  revalidatePath("/admin/users");
  await createAuditLog({
    userId: actor.id,
    action: updatedUser.isActive ? "USER_ENABLED" : "USER_DISABLED",
    details: {
      userId: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
    },
  });

  return {
    status: "SUCCESS",
    message: `${updatedUser.username} is now ${
      updatedUser.isActive ? "active" : "inactive"
    }.`,
  };
}

export async function updateUserRoleAction(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const actor = await requireRole(["SUPER_ADMIN"]);

  const userId = getRequiredString(formData, "userId");
  const role = getUserRole(formData);

  if (!userId || !role) {
    return {
      status: "ERROR",
      message: "User ID and role are required.",
    };
  }

  const currentUser = await findUserById(userId);

  if (!currentUser) {
    return {
      status: "ERROR",
      message: "User was not found.",
    };
  }

  const updatedUser = await updateUserRole(userId, role);

  if (!updatedUser) {
    return {
      status: "ERROR",
      message: "User was not found.",
    };
  }

  revalidatePath("/admin/users");
  await createAuditLog({
    userId: actor.id,
    action: "USER_ROLE_CHANGED",
    details: {
      userId: updatedUser.id,
      username: updatedUser.username,
      previousRole: currentUser.role,
      role: updatedUser.role,
    },
  });

  return {
    status: "SUCCESS",
    message: `${updatedUser.username} is now ${formatRole(updatedUser.role)}.`,
  };
}

export async function resetUserPasswordAction(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const actor = await requireRole(["SUPER_ADMIN"]);

  const userId = getRequiredString(formData, "userId");

  if (!userId) {
    return {
      status: "ERROR",
      message: "User ID is required.",
    };
  }

  const user = await findUserById(userId);

  if (!user) {
    return {
      status: "ERROR",
      message: "User was not found.",
    };
  }

  const password = generateEasyPassword();
  await updateUserPassword(user.id, await hashPassword(password));
  revalidatePath("/admin/users");
  await createAuditLog({
    userId: actor.id,
    action: "PASSWORD_RESET",
    details: {
      userId: user.id,
      username: user.username,
      role: user.role,
    },
  });

  return {
    status: "SUCCESS",
    message: `Password reset for ${user.username}.`,
    generatedPassword: password,
  };
}

export async function generateUsernameAction(name?: string): Promise<string> {
  await requireRole(["SUPER_ADMIN"]);

  return generateUsername(name);
}

export async function generateEasyPasswordAction(): Promise<string> {
  await requireRole(["SUPER_ADMIN"]);

  return generateEasyPassword();
}

function getRequiredString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalString(formData: FormData, key: string): string | undefined {
  return getRequiredString(formData, key) || undefined;
}

function getUserRole(formData: FormData): UserRole | null {
  const role = getRequiredString(formData, "role") as UserRole;

  return USER_ROLES.includes(role) ? role : null;
}
