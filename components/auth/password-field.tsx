"use client";

import { useState } from "react";

export function PasswordField() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Password</span>
      <div className="relative mt-1">
        <input
          className="h-11 w-full rounded-md border border-zinc-300 px-3 pr-11 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          name="password"
          type={isVisible ? "text" : "password"}
          autoComplete="current-password"
          required
        />
        <button
          aria-label={isVisible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-zinc-500 transition hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-200"
          type="button"
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
      <path d="M9.9 4.3A9.6 9.6 0 0 1 12 4c6.5 0 10 8 10 8a17.4 17.4 0 0 1-3.1 4.6" />
      <path d="M6.1 6.1C3.4 8 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 4-.8" />
    </svg>
  );
}
