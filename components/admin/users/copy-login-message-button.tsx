"use client";

import { useState } from "react";

import { buildLoginMessage } from "@/lib/login-message";

export function CopyLoginMessageButton({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const [status, setStatus] = useState<"IDLE" | "COPIED" | "ERROR">("IDLE");

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(
        buildLoginMessage({ username, password }),
      );
      setStatus("COPIED");
    } catch {
      setStatus("ERROR");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
        type="button"
        onClick={copyMessage}
      >
        Copy login message
      </button>
      {status === "COPIED" ? (
        <span className="text-sm font-medium text-emerald-700">Copied</span>
      ) : null}
      {status === "ERROR" ? (
        <span className="text-sm font-medium text-red-700">
          Could not copy
        </span>
      ) : null}
    </div>
  );
}
