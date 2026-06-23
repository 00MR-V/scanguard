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
        <AuditDetails details={log.details} />
      </td>
    </tr>
  );
}

function AuditDetails({
  details,
}: {
  details: Record<string, unknown> | null;
}) {
  const entries = Object.entries(details ?? {}).filter(
    ([, value]) => value !== undefined,
  );

  if (entries.length === 0) {
    return <span className="text-sm text-zinc-500">No details</span>;
  }

  return (
    <dl className="grid max-w-full gap-2 rounded-md bg-zinc-50 p-3 text-sm sm:max-w-xl sm:grid-cols-[9rem_1fr]">
      {entries.map(([key, value]) => (
        <div className="contents" key={key}>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            {formatDetailLabel(key)}
          </dt>
          <dd className="min-w-0 break-words text-zinc-800">
            {formatDetailValue(key, value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function formatDetailLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string") {
    if (["reason", "role", "previousRole", "status"].includes(key)) {
      return value
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    return value;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return JSON.stringify(value);
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
