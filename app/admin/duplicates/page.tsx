import Link from "next/link";

import { requireRole } from "@/lib/auth";
import {
  searchDuplicateAttempts,
  type SearchDuplicateAttemptResult,
} from "@/lib/repositories/scans";

type HistoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export default async function AdminDuplicatesPage({
  searchParams,
}: HistoryPageProps) {
  await requireRole(["SUPER_ADMIN", "ADMIN"]);

  const params = await searchParams;
  const filters = parseFilters(params);
  const duplicates = await searchDuplicateAttempts(filters);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-semibold text-red-700">Duplicate history</p>
          <h1 className="mt-1 text-3xl font-semibold">
            Duplicate scan attempts
          </h1>
        </header>

        <SearchForm filters={filters} />

        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          {duplicates.length === 0 ? (
            <p className="text-sm text-zinc-500">No duplicate attempts found.</p>
          ) : (
            <div className="responsive-table-wrap overflow-x-auto">
              <table className="responsive-table w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Barcode</th>
                    <th className="py-2 pr-3">Original scanned by</th>
                    <th className="py-2 pr-3">Original scanned at</th>
                    <th className="py-2 pr-3">Duplicate attempted by</th>
                    <th className="py-2 pr-3">Duplicate attempted at</th>
                    <th className="py-2 pr-3">Device ID</th>
                    <th className="py-2 pr-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {duplicates.map((duplicate) => (
                    <DuplicateRow key={duplicate.id} duplicate={duplicate} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Pagination
          basePath="/admin/duplicates"
          filters={filters}
          resultCount={duplicates.length}
        />
      </div>
    </main>
  );
}

function SearchForm({ filters }: { filters: ParsedFilters }) {
  return (
    <form className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:grid-cols-5">
      <FilterInput
        label="Barcode"
        name="barcodeValue"
        value={filters.barcodeValue}
      />
      <FilterInput
        label="Scanner username"
        name="scannerUsername"
        value={filters.scannerUsername}
      />
      <FilterInput label="Date from" name="dateFrom" type="date" value={filters.dateFrom} />
      <FilterInput label="Date to" name="dateTo" type="date" value={filters.dateTo} />
      <FilterInput label="Limit" name="limit" type="number" value={String(filters.limit)} />
      <input name="offset" type="hidden" value="0" />
      <button
        className="h-11 rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 md:col-span-5"
        type="submit"
      >
        Search
      </button>
    </form>
  );
}

function FilterInput({
  label,
  name,
  type = "text",
  value,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input
        className="mt-1 h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
        name={name}
        type={type}
        defaultValue={value}
        min={type === "number" ? 1 : undefined}
        max={type === "number" ? MAX_LIMIT : undefined}
      />
    </label>
  );
}

function DuplicateRow({
  duplicate,
}: {
  duplicate: SearchDuplicateAttemptResult;
}) {
  return (
    <tr>
      <td className="py-3 pr-3 font-medium" data-label="Barcode">{duplicate.barcodeValue}</td>
      <td className="py-3 pr-3" data-label="Original scanned by">
        {duplicate.originalScannedByFullName ||
          duplicate.originalScannedByUsername ||
          "-"}
      </td>
      <td className="py-3 pr-3" data-label="Original scanned at">
        {formatOptionalDateTime(duplicate.originalScannedAt)}
      </td>
      <td className="py-3 pr-3" data-label="Duplicate attempted by">
        {duplicate.attemptedByFullName || duplicate.attemptedByUsername}
      </td>
      <td className="py-3 pr-3" data-label="Duplicate attempted at">{formatDateTime(duplicate.attemptedAt)}</td>
      <td className="py-3 pr-3" data-label="Device ID">{duplicate.deviceId ?? "-"}</td>
      <td className="py-3 pr-3" data-label="Location">{duplicate.location ?? "-"}</td>
    </tr>
  );
}

type ParsedFilters = {
  barcodeValue?: string;
  scannerUsername?: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  offset: number;
};

function parseFilters(
  params: Record<string, string | string[] | undefined>,
): ParsedFilters {
  return {
    barcodeValue: getParam(params, "barcodeValue"),
    scannerUsername: getParam(params, "scannerUsername"),
    dateFrom: getParam(params, "dateFrom"),
    dateTo: getParam(params, "dateTo"),
    limit: clampNumber(getParam(params, "limit"), DEFAULT_LIMIT, 1, MAX_LIMIT),
    offset: clampNumber(getParam(params, "offset"), 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

function Pagination({
  basePath,
  filters,
  resultCount,
}: {
  basePath: string;
  filters: ParsedFilters;
  resultCount: number;
}) {
  const previousOffset = Math.max(filters.offset - filters.limit, 0);
  const nextOffset = filters.offset + filters.limit;

  return (
    <nav className="flex items-center justify-between">
      {filters.offset > 0 ? (
        <Link
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          href={buildPageHref(basePath, filters, previousOffset)}
        >
          Previous
        </Link>
      ) : (
        <span />
      )}
      {resultCount === filters.limit ? (
        <Link
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          href={buildPageHref(basePath, filters, nextOffset)}
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
}

function buildPageHref(
  basePath: string,
  filters: ParsedFilters,
  offset: number,
): string {
  const params = new URLSearchParams();

  appendParam(params, "barcodeValue", filters.barcodeValue);
  appendParam(params, "scannerUsername", filters.scannerUsername);
  appendParam(params, "dateFrom", filters.dateFrom);
  appendParam(params, "dateTo", filters.dateTo);
  params.set("limit", String(filters.limit));
  params.set("offset", String(offset));

  return `${basePath}?${params.toString()}`;
}

function appendParam(params: URLSearchParams, key: string, value?: string) {
  if (value) {
    params.set(key, value);
  }
}

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

function clampNumber(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function formatOptionalDateTime(value: Date | null): string {
  return value ? formatDateTime(value) : "-";
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
