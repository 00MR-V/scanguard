"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import {
  submitScanAction,
  type SubmitScanResult,
} from "@/actions/scan-actions";

export function ScanForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<SubmitScanResult | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const nextResult = await submitScanAction(formData);

      setResult(nextResult);

      if (
        nextResult.status === "SUCCESS" ||
        nextResult.status === "DUPLICATE"
      ) {
        form.reset();
      }

      focusInput();
    });
  }

  return (
    <section className="flex flex-1 flex-col gap-5">
      <form
        className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
        onSubmit={handleSubmit}
      >
        <label className="block">
          <span className="text-sm font-semibold uppercase tracking-normal text-zinc-600">
            Barcode
          </span>
          <input
            ref={inputRef}
            className="mt-2 h-16 w-full rounded-md border-2 border-zinc-300 px-4 text-3xl font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
            name="barcodeValue"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={isPending}
            required
          />
        </label>

        <button
          className="mt-4 h-14 w-full rounded-md bg-zinc-950 px-4 text-lg font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Scanning..." : "Submit Scan"}
        </button>
      </form>

      {result ? <ScanResult result={result} /> : <ReadyState />}
    </section>
  );
}

function ReadyState() {
  return (
    <section className="flex flex-1 items-center rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-4xl font-bold">READY</p>
      </div>
    </section>
  );
}

function ScanResult({ result }: { result: SubmitScanResult }) {
  if (result.status === "SUCCESS") {
    return (
      <section className="flex flex-1 items-center rounded-lg border border-emerald-300 bg-emerald-100 p-6 text-emerald-950 shadow-sm">
        <div className="w-full">
          <p className="text-5xl font-black">VALID SCAN</p>
          <dl className="mt-5 space-y-3 text-xl">
            <ResultRow label="Barcode" value={result.barcodeValue} />
            <ResultRow label="Time" value={formatDateTime(result.scannedAt)} />
          </dl>
        </div>
      </section>
    );
  }

  if (result.status === "DUPLICATE") {
    return (
      <section className="flex flex-1 items-center rounded-lg border border-red-300 bg-red-100 p-6 text-red-950 shadow-sm">
        <div className="w-full">
          <p className="text-5xl font-black">DUPLICATE</p>
          <dl className="mt-5 space-y-3 text-xl">
            <ResultRow label="Barcode" value={result.barcodeValue} />
            <ResultRow label="First scanned by" value={result.originalScannedBy} />
            <ResultRow
              label="First scanned at"
              value={formatDateTime(result.originalScannedAt)}
            />
            <ResultRow
              label="Duplicate attempted at"
              value={formatDateTime(result.duplicateAttemptedAt)}
            />
          </dl>
        </div>
      </section>
    );
  }

  const title =
    result.status === "INVALID_FORMAT"
      ? "INVALID BARCODE"
      : result.status === "EVENT_CLOSED"
        ? "NO ACTIVE EVENT"
        : "SYSTEM ERROR";

  return (
    <section className="flex flex-1 items-center rounded-lg border border-yellow-300 bg-yellow-100 p-6 text-yellow-950 shadow-sm">
      <div>
        <p className="text-5xl font-black">{title}</p>
        <p className="mt-4 text-xl">{result.message}</p>
      </div>
    </section>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold uppercase tracking-normal opacity-70">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}
