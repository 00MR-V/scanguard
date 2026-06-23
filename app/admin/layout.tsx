import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const links = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/scans", label: "Scans" },
    { href: "/admin/duplicates", label: "Duplicates" },
    { href: "/scan", label: "Scanner" },
    ...(user.role === "SUPER_ADMIN"
      ? [{ href: "/admin/audit-logs", label: "Audit Logs" }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-lg font-semibold">ScanGuard</p>
            <p className="break-words text-sm text-zinc-500">
              {user.fullName || user.username} · {formatRole(user.role)}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <nav className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {links.map((link) => (
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              <a
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
                href="/api/admin/export/scans"
              >
                Export Scans CSV
              </a>
              <a
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
                href="/api/admin/export/duplicates"
              >
                Export Duplicates CSV
              </a>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

function formatRole(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
