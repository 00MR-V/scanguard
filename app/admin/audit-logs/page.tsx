import { requireRole } from "@/lib/auth";
import {
  listAuditLogs,
  type AuditLog,
} from "@/lib/repositories/audit-logs";

export default async function AuditLogsPage() {
  await requireRole(["SUPER_ADMIN"]);

  const logs = await listAuditLogs(200);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-semibold text-emerald-700">Security</p>
          <h1 className="mt-1 text-3xl font-semibold">Audit logs</h1>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          {logs.length === 0 ? (
            <p className="text-sm text-zinc-500">No audit logs found.</p>
          ) : (
            <div className="responsive-table-wrap overflow-x-auto">
              <table className="responsive-table w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2 pr-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {logs.map((log) => (
                    <AuditLogRow key={log.id} log={log} />
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

function AuditLogRow({ log }: { log: AuditLog }) {
  return (
    <tr>
      <td className="py-3 pr-3 align-top" data-label="Time">{formatDateTime(log.createdAt)}</td>
      <td className="py-3 pr-3 align-top" data-label="User">
        {log.fullName || log.username || "-"}
      </td>
      <td className="py-3 pr-3 align-top font-medium" data-label="Action">{log.action}</td>
      <td className="py-3 pr-3 align-top" data-label="Details">
        <pre className="max-w-full whitespace-pre-wrap break-words rounded-md bg-zinc-50 p-3 text-xs text-zinc-700 sm:max-w-xl">
          {formatDetails(log.details)}
        </pre>
      </td>
    </tr>
  );
}

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details) {
    return "{}";
  }

  return JSON.stringify(details, null, 2);
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
