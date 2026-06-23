import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { requireRole } from "@/lib/auth";
import { getActiveEvent } from "@/lib/repositories/events";
import { ScanForm } from "@/components/scan/scan-form";

export default async function ScanPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN", "SCANNER"]);
  const activeEvent = await getActiveEvent();
  const displayName = user.fullName || user.username;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-5 text-zinc-950 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col gap-5">
        <header className="scan-page-header rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                {activeEvent ? activeEvent.name : "No active event"}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal">
                Scanner
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-zinc-500">Signed in as</p>
              <p className="text-lg font-semibold">{displayName}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {user.role === "SUPER_ADMIN" || user.role === "ADMIN" ? (
              <>
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
                  href="/admin/dashboard"
                >
                  Dashboard
                </Link>
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
                  href="/admin/users"
                >
                  Users
                </Link>
              </>
            ) : null}
            <LogoutButton />
          </div>
        </header>

        {activeEvent ? (
          <ScanForm />
        ) : (
          <section className="rounded-lg border border-yellow-300 bg-yellow-100 p-6 text-yellow-950 shadow-sm">
            <p className="text-3xl font-bold">NO ACTIVE EVENT</p>
            <p className="mt-3 text-lg">
              Scanning is unavailable until an active event is created.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
