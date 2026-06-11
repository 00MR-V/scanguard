import Link from "next/link";

import { CreateUserForm } from "@/components/admin/users/create-user-form";
import { requireRole } from "@/lib/auth";

export default async function NewAdminUserPage() {
  await requireRole(["SUPER_ADMIN"]);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <Link
            className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            href="/admin/users"
          >
            Back to users
          </Link>
          <h1 className="mt-3 text-3xl font-semibold">Create user</h1>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <CreateUserForm />
        </section>
      </div>
    </main>
  );
}
