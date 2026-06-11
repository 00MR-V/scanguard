import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { listUsers, type User } from "@/lib/repositories/users";
import { UserActionsCell } from "@/components/admin/users/user-actions-cell";

export default async function AdminUsersPage() {
  const viewer = await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const users = await listUsers();

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              User management
            </p>
            <h1 className="mt-1 text-3xl font-semibold">Users</h1>
          </div>
          {viewer.role === "SUPER_ADMIN" ? (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              href="/admin/users/new"
            >
              Create user
            </Link>
          ) : null}
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          {users.length === 0 ? (
            <p className="text-sm text-zinc-500">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Username</th>
                    <th className="py-2 pr-3">Full name</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Created at</th>
                    <th className="py-2 pr-3">Last login</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      viewerRole={viewer.role}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function UserRow({
  user,
  viewerRole,
}: {
  user: User;
  viewerRole: User["role"];
}) {
  return (
    <tr>
      <td className="py-3 pr-3 font-medium">{user.username}</td>
      <td className="py-3 pr-3">{user.fullName ?? "-"}</td>
      <td className="py-3 pr-3">{formatRole(user.role)}</td>
      <td className="py-3 pr-3">
        <span
          className={
            user.isActive
              ? "rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"
              : "rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600"
          }
        >
          {user.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="py-3 pr-3">{formatDateTime(user.createdAt)}</td>
      <td className="py-3 pr-3">{formatDateTime(user.lastLoginAt)}</td>
      <td className="py-3 pr-3">
        <UserActionsCell user={user} viewerRole={viewerRole} />
      </td>
    </tr>
  );
}

function formatRole(role: User["role"]): string {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
