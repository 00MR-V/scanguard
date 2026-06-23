import { requireRole } from "@/lib/auth";
import { getActiveEvent } from "@/lib/repositories/events";
import {
  getDashboardStats,
  getRecentScanActivity,
  getTopScanners,
  type RecentDuplicateAttempt,
  type RecentScanActivity,
  type TopScanner,
} from "@/lib/repositories/dashboard";

export default async function AdminDashboardPage() {
  await requireRole(["SUPER_ADMIN", "ADMIN"]);

  const activeEvent = await getActiveEvent();

  if (!activeEvent) {
    return (
      <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <section className="mt-6 rounded-lg border border-yellow-300 bg-yellow-100 p-6 text-yellow-950">
            <p className="text-2xl font-bold">No active event</p>
            <p className="mt-2">Create or activate an event to view scan stats.</p>
          </section>
        </div>
      </main>
    );
  }

  const [stats, recentActivity, topScanners] = await Promise.all([
    getDashboardStats(activeEvent.id),
    getRecentScanActivity(activeEvent.id, 20),
    getTopScanners(activeEvent.id, 10),
  ]);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-semibold text-emerald-700">
            {activeEvent.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">Admin Dashboard</h1>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Valid scans" value={stats.totalValidScans} />
          <StatCard
            label="Duplicate attempts"
            value={stats.totalDuplicateAttempts}
          />
          <StatCard
            label="Active scanner users"
            value={stats.activeScannerUsers}
          />
          <StatCard label="Last scan" value={formatDateTime(stats.lastScanAt)} />
          <StatCard
            label="Scans last 15 minutes"
            value={stats.scansLast15Minutes}
          />
          <StatCard label="Scans last hour" value={stats.scansLastHour} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <RecentActivityTable activities={recentActivity} />
          <TopScannersTable scanners={topScanners} />
        </section>

        <RecentDuplicatesTable duplicates={stats.recentDuplicateAttempts} />
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function RecentActivityTable({
  activities,
}: {
  activities: RecentScanActivity[];
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Recent scan activity</h2>
      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No scans yet.</p>
      ) : (
        <div className="responsive-table-wrap mt-4 overflow-x-auto">
          <table className="responsive-table w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-2 pr-3">Barcode</th>
                <th className="py-2 pr-3">Scanner</th>
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td className="py-3 pr-3 font-medium" data-label="Barcode">
                    {activity.barcodeValue}
                  </td>
                  <td className="py-3 pr-3" data-label="Scanner">{formatUser(activity)}</td>
                  <td className="py-3 pr-3" data-label="Time">
                    {formatDateTime(activity.scannedAt)}
                  </td>
                  <td className="py-3 pr-3" data-label="Device">{activity.deviceId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TopScannersTable({ scanners }: { scanners: TopScanner[] }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Top scanners</h2>
      {scanners.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No scanner activity yet.</p>
      ) : (
        <div className="responsive-table-wrap mt-4 overflow-x-auto">
          <table className="responsive-table w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-2 pr-3">Scanner</th>
                <th className="py-2 pr-3">Scans</th>
                <th className="py-2 pr-3">Last scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {scanners.map((scanner) => (
                <tr key={scanner.userId}>
                  <td className="py-3 pr-3 font-medium" data-label="Scanner">
                    {scanner.fullName || scanner.username}
                  </td>
                  <td className="py-3 pr-3" data-label="Scans">{scanner.scanCount}</td>
                  <td className="py-3 pr-3" data-label="Last scan">
                    {formatDateTime(scanner.lastScanAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RecentDuplicatesTable({
  duplicates,
}: {
  duplicates: RecentDuplicateAttempt[];
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Recent duplicate attempts</h2>
      {duplicates.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No duplicate attempts yet.</p>
      ) : (
        <div className="responsive-table-wrap mt-4 overflow-x-auto">
          <table className="responsive-table w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-2 pr-3">Barcode</th>
                <th className="py-2 pr-3">Attempted by</th>
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {duplicates.map((duplicate) => (
                <tr key={duplicate.id}>
                  <td className="py-3 pr-3 font-medium" data-label="Barcode">
                    {duplicate.barcodeValue}
                  </td>
                  <td className="py-3 pr-3" data-label="Attempted by">
                    {duplicate.attemptedByFullName ||
                      duplicate.attemptedByUsername}
                  </td>
                  <td className="py-3 pr-3" data-label="Time">
                    {formatDateTime(duplicate.attemptedAt)}
                  </td>
                  <td className="py-3 pr-3" data-label="Location">{duplicate.location ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatUser(activity: RecentScanActivity): string {
  return activity.scannerFullName || activity.scannerUsername;
}

function formatDateTime(value: Date | string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
