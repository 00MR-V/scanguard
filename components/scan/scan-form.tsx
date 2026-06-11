"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import {
  submitScanAction,
  type SubmitScanResult,
} from "@/actions/scan-actions";

type DetectedBarcode = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

export function ScanForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [result, setResult] = useState<SubmitScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    inputRef.current?.focus();

    return () => {
      stopCamera();
    };
  }, []);

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function submitBarcode(barcodeValue: string) {
    if (!barcodeValue.trim() || isPending) {
      focusInput();
      return;
    }

    const formData = new FormData();
    formData.set("barcodeValue", barcodeValue);

    startTransition(async () => {
      const nextResult = await submitScanAction(formData);

      setResult(nextResult);

      if (
        nextResult.status === "SUCCESS" ||
        nextResult.status === "DUPLICATE"
      ) {
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }

      focusInput();
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitBarcode(inputRef.current?.value ?? "");
  }

  async function openCamera() {
    setCameraError(null);

    if (!window.BarcodeDetector) {
      setCameraError("Camera barcode scanning is not supported in this browser.");
      focusInput();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      detectFromCamera(new window.BarcodeDetector());
    } catch {
      setCameraError("Camera access was blocked or unavailable.");
      stopCamera();
      focusInput();
    }
  }

  async function detectFromCamera(detector: BarcodeDetectorInstance) {
    if (!videoRef.current || !streamRef.current) {
      return;
    }

    try {
      const barcodes = await detector.detect(videoRef.current);
      const barcodeValue = barcodes[0]?.rawValue?.trim();

      if (barcodeValue) {
        if (inputRef.current) {
          inputRef.current.value = barcodeValue;
        }

        stopCamera();
        submitBarcode(barcodeValue);
        return;
      }
    } catch {
      setCameraError("Could not read a barcode from the camera.");
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      void detectFromCamera(detector);
    });
  }

  function stopCamera() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOpen(false);
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

        <button
          className="mt-3 h-14 w-full rounded-md border border-zinc-300 bg-white px-4 text-lg font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          type="button"
          disabled={isPending}
          onClick={isCameraOpen ? stopCamera : openCamera}
        >
          {isCameraOpen ? "Close Camera" : "Open Camera Scanner"}
        </button>

        {cameraError ? (
          <div className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-950">
            {cameraError}
          </div>
        ) : null}

        {isCameraOpen ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-300 bg-black">
            <video
              ref={videoRef}
              className="aspect-video w-full object-cover"
              muted
              playsInline
            />
          </div>
        ) : null}
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
