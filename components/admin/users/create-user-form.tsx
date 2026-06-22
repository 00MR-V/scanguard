"use client";

import { useActionState, useRef, useState, useTransition } from "react";

import {
  createUserAction,
  generateEasyPasswordAction,
  generateUsernameAction,
  type CreateUserState,
} from "@/actions/user-actions";
import { formatRole, USER_ROLES } from "@/lib/user-roles";

const INITIAL_STATE: CreateUserState = {
  status: "IDLE",
};

export function CreateUserForm() {
  const fullNameRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState(
    createUserAction,
    INITIAL_STATE,
  );
  const [isGenerating, startGenerateTransition] = useTransition();
  const [visiblePassword, setVisiblePassword] = useState<string | null>(null);

  function generateUsername() {
    startGenerateTransition(async () => {
      const username = await generateUsernameAction(fullNameRef.current?.value);

      if (usernameRef.current) {
        usernameRef.current.value = username;
      }
    });
  }

  function generatePassword() {
    startGenerateTransition(async () => {
      const password = await generateEasyPasswordAction();

      if (passwordRef.current) {
        passwordRef.current.value = password;
      }

      setVisiblePassword(password);
    });
  }

  const shownPassword = state.generatedPassword ?? visiblePassword;

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "ERROR" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      ) : null}

      {state.status === "SUCCESS" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <p>{state.message}</p>
          {shownPassword ? (
            <p className="mt-2 font-semibold">Password: {shownPassword}</p>
          ) : null}
        </div>
      ) : null}

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Full name</span>
        <input
          ref={fullNameRef}
          className="mt-1 h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          name="fullName"
          type="text"
          autoComplete="name"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Username</span>
        <div className="mt-1 flex gap-2">
          <input
            ref={usernameRef}
            className="h-11 min-w-0 flex-1 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            name="username"
            type="text"
            autoComplete="username"
            required
          />
          <button
            className="h-11 rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
            type="button"
            disabled={isPending || isGenerating}
            onClick={generateUsername}
          >
            Generate username
          </button>
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Role</span>
        <select
          className="mt-1 h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          name="role"
          defaultValue="SCANNER"
          required
        >
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {formatRole(role)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Password</span>
        <div className="mt-1 flex gap-2">
          <input
            ref={passwordRef}
            className="h-11 min-w-0 flex-1 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            name="password"
            type="text"
            autoComplete="new-password"
            required
          />
          <button
            className="h-11 rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
            type="button"
            disabled={isPending || isGenerating}
            onClick={generatePassword}
          >
            Generate password
          </button>
        </div>
      </label>

      {shownPassword ? (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-950">
          Show this password to the user now. It is not stored as plain text.
          <p className="mt-2 font-semibold">{shownPassword}</p>
        </div>
      ) : null}

      <button
        className="h-11 w-full rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        type="submit"
        disabled={isPending || isGenerating}
      >
        {isPending ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}
