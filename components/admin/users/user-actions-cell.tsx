"use client";

import { useActionState } from "react";

import {
  resetUserPasswordAction,
  updateUserActiveStatusAction,
  updateUserRoleAction,
  type UserActionState,
} from "@/actions/user-actions";
import { CopyLoginMessageButton } from "@/components/admin/users/copy-login-message-button";
import type { User } from "@/lib/repositories/users";
import { formatRole, USER_ROLES, type UserRole } from "@/lib/user-roles";

const INITIAL_STATE: UserActionState = {
  status: "IDLE",
};

export function UserActionsCell({
  user,
  viewerRole,
}: {
  user: User;
  viewerRole: UserRole;
}) {
  const [statusState, statusAction, isStatusPending] = useActionState(
    updateUserActiveStatusAction,
    INITIAL_STATE,
  );
  const [resetState, resetAction, isResetPending] = useActionState(
    resetUserPasswordAction,
    INITIAL_STATE,
  );
  const [roleState, roleAction, isRolePending] = useActionState(
    updateUserRoleAction,
    INITIAL_STATE,
  );
  const canManage = viewerRole === "SUPER_ADMIN";

  if (!canManage) {
    return <span className="text-sm text-zinc-500">View only</span>;
  }

  return (
    <div className="min-w-0 space-y-2">
      <form action={roleAction} className="grid gap-2 sm:flex sm:flex-wrap sm:items-end">
        <input name="userId" type="hidden" value={user.id} />
        <label className="min-w-0 sm:min-w-40">
          <span className="text-xs font-semibold text-zinc-600">Role</span>
          <select
            className="mt-1 h-10 w-full rounded-md border border-zinc-300 px-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
            name="role"
            defaultValue={user.role}
            disabled={isRolePending}
            required
          >
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {formatRole(role)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
          type="submit"
          disabled={isRolePending}
        >
          {isRolePending ? "Saving..." : "Save role"}
        </button>
      </form>

      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <form action={statusAction} className="w-full sm:w-auto">
          <input name="userId" type="hidden" value={user.id} />
          <input
            name="isActive"
            type="hidden"
            value={String(!user.isActive)}
          />
          <button
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50 sm:w-auto"
            type="submit"
            disabled={isStatusPending}
          >
            {user.isActive ? "Deactivate" : "Activate"}
          </button>
        </form>

        <form action={resetAction} className="w-full sm:w-auto">
          <input name="userId" type="hidden" value={user.id} />
          <button
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50 sm:w-auto"
            type="submit"
            disabled={isResetPending}
          >
            Reset password
          </button>
        </form>
      </div>

      {statusState.status === "ERROR" ||
      resetState.status === "ERROR" ||
      roleState.status === "ERROR" ? (
        <p className="text-sm text-red-700">
          {statusState.message || resetState.message || roleState.message}
        </p>
      ) : null}

      {roleState.status === "SUCCESS" ? (
        <p className="text-sm text-emerald-700">{roleState.message}</p>
      ) : null}

      {resetState.generatedPassword ? (
        <div className="space-y-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-950">
          <p className="font-semibold">New password</p>
          <p>{resetState.generatedPassword}</p>
          <CopyLoginMessageButton
            username={user.username}
            password={resetState.generatedPassword}
          />
        </div>
      ) : null}
    </div>
  );
}
