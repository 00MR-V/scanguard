"use client";

import { useActionState } from "react";

import {
  resetUserPasswordAction,
  updateUserActiveStatusAction,
  type UserActionState,
} from "@/actions/user-actions";
import type { User, UserRole } from "@/lib/repositories/users";

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
  const canManage = viewerRole === "SUPER_ADMIN";

  if (!canManage) {
    return <span className="text-sm text-zinc-500">View only</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <form action={statusAction}>
          <input name="userId" type="hidden" value={user.id} />
          <input
            name="isActive"
            type="hidden"
            value={String(!user.isActive)}
          />
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
            type="submit"
            disabled={isStatusPending}
          >
            {user.isActive ? "Deactivate" : "Activate"}
          </button>
        </form>

        <form action={resetAction}>
          <input name="userId" type="hidden" value={user.id} />
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
            type="submit"
            disabled={isResetPending}
          >
            Reset password
          </button>
        </form>
      </div>

      {statusState.status === "ERROR" || resetState.status === "ERROR" ? (
        <p className="text-sm text-red-700">
          {statusState.message || resetState.message}
        </p>
      ) : null}

      {resetState.generatedPassword ? (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-950">
          <p className="font-semibold">New password</p>
          <p>{resetState.generatedPassword}</p>
        </div>
      ) : null}
    </div>
  );
}
