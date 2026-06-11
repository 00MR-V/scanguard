"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import {
  submitScanAction,
  type SubmitScanResult,
} from "@/actions/scan-actions";

type ScannerMode = "CHOICE" | "CAMERA" | "MANUAL" | "RESULT";

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
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const isSubmittingRef = useRef(false);
  const [mode, setMode] = useState<ScannerMode>("CHOICE");
  const [result, setResult] = useState<SubmitScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (mode === "MANUAL") {
      inputRef.current?.focus();
    }

    return () => {
      if (mode === "CAMERA") {
        stopCamera();
      }
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "CAMERA" || !videoRef.current || !streamRef.current) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = streamRef.current;

    video
      .play()
      .catch(() => {
        setCameraError("Could not start the camera preview.");
        stopCamera();
        setMode("CHOICE");
      });
  }, [mode]);

  function submitBarcode(barcodeValue: string) {
    const trimmedBarcode = barcodeValue.trim();

    if (!trimmedBarcode || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    const formData = new FormData();
    formData.set("barcodeValue", trimmedBarcode);

    startTransition(async () => {
      try {
        const nextResult = await submitScanAction(formData);

        setResult(nextResult);

        if (inputRef.current) {
          inputRef.current.value = "";
        }

        setMode("RESULT");
      } finally {
        isSubmittingRef.current = false;
      }
    });
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitBarcode(inputRef.current?.value ?? "");
  }

  async function openCamera() {
    setCameraError(null);
    setResult(null);
    setIsCameraStarting(true);

    if (!window.BarcodeDetector) {
      setCameraError("Camera barcode scanning is not supported in this browser.");
      setIsCameraStarting(false);
      setMode("CHOICE");
      return;
    }

    try {
      detectorRef.current = new window.BarcodeDetector({
        formats: [
          "code_128",
          "code_39",
          "code_93",
          "codabar",
          "ean_13",
          "ean_8",
          "itf",
          "upc_a",
          "upc_e",
          "qr_code",
        ],
      });
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setMode("CAMERA");
    } catch {
      setCameraError("Camera access was blocked or unavailable.");
      stopCamera();
      setMode("CHOICE");
    } finally {
      setIsCameraStarting(false);
    }
  }

  async function scanCameraFrame() {
    if (
      !videoRef.current ||
      !streamRef.current ||
      !detectorRef.current ||
      isSubmittingRef.current ||
      isDetecting
    ) {
      return;
    }

    setCameraError(null);
    setIsDetecting(true);

    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      const barcodeValue = barcodes[0]?.rawValue?.trim();

      if (barcodeValue) {
        stopCamera();
        submitBarcode(barcodeValue);
        return;
      }

      setCameraError("No barcode was detected. Try again.");
    } catch {
      setCameraError("Could not read a barcode from the camera.");
    } finally {
      setIsDetecting(false);
    }
  }

  function stopCamera() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function startManualEntry() {
    stopCamera();
    setCameraError(null);
    setResult(null);
    setMode("MANUAL");
  }

  function resetToChoice() {
    stopCamera();
    setCameraError(null);
    setResult(null);
    setMode("CHOICE");
  }

  if (mode === "CAMERA") {
    return (
      <section className="flex flex-1 flex-col">
        <div className="flex h-[calc(100svh-13rem)] min-h-[390px] max-h-[620px] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950 shadow-sm sm:h-[calc(100svh-15rem)] lg:min-h-[620px]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-white sm:px-4 sm:py-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-emerald-300">
                Scan student ID
              </p>
              <p className="text-xs text-zinc-400">Camera active</p>
            </div>
            <button
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
              type="button"
              onClick={resetToChoice}
            >
              Cancel
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-x-[8%] top-1/2 h-20 -translate-y-1/2 rounded-lg border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)] sm:inset-x-[10%] sm:h-28" />
          </div>
          <div className="border-t border-white/10 bg-zinc-950 p-3 sm:p-4">
            {cameraError ? (
              <div className="mb-3 rounded-md border border-yellow-400/40 bg-yellow-100 px-3 py-2 text-sm text-yellow-950">
                {cameraError}
              </div>
            ) : null}
            <button
              className="h-12 w-full rounded-md bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 sm:h-14 sm:text-lg"
              type="button"
              disabled={isPending || isDetecting}
              onClick={scanCameraFrame}
            >
              {isDetecting ? "Scanning..." : "Scan Now"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (mode === "MANUAL") {
    return (
      <section className="flex flex-1 items-start justify-center">
        <form
          className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
          onSubmit={handleManualSubmit}
        >
          <label className="block">
            <span className="text-sm font-semibold uppercase tracking-normal text-zinc-600">
              Student ID
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

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              className="h-12 rounded-md bg-zinc-950 px-4 text-base font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              type="submit"
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Submit ID"}
            </button>
            <button
              className="h-12 rounded-md border border-zinc-300 px-4 text-base font-semibold text-zinc-900 transition hover:bg-zinc-100"
              type="button"
              onClick={resetToChoice}
            >
              Back
            </button>
          </div>
        </form>
      </section>
    );
  }

  if (mode === "RESULT" && result) {
    return (
      <section className="flex flex-1 flex-col gap-5">
        <ScanResult result={result} />
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="h-14 rounded-md bg-emerald-700 px-4 text-lg font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            type="button"
            disabled={isPending || isCameraStarting}
            onClick={openCamera}
          >
            {isCameraStarting ? "Starting..." : "Scan Again"}
          </button>
          <button
            className="h-14 rounded-md border border-zinc-300 bg-white px-4 text-lg font-semibold text-zinc-900 transition hover:bg-zinc-100"
            type="button"
            onClick={startManualEntry}
          >
            Manual Entry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 items-start justify-center">
      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        <button
          className="min-h-52 rounded-lg border border-emerald-200 bg-emerald-700 p-6 text-left text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          type="button"
          disabled={isPending || isCameraStarting}
          onClick={openCamera}
        >
          <p className="text-3xl font-black">Scan Student ID</p>
          <p className="mt-3 text-sm text-emerald-50">
            {isCameraStarting ? "Starting camera..." : "Open camera scanner"}
          </p>
        </button>

        <button
          className="min-h-52 rounded-lg border border-zinc-200 bg-white p-6 text-left text-zinc-950 shadow-sm transition hover:bg-zinc-50"
          type="button"
          onClick={startManualEntry}
        >
          <p className="text-3xl font-black">Manual Entry</p>
          <p className="mt-3 text-sm text-zinc-500">Type the ID number</p>
        </button>

        {cameraError ? (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-950 sm:col-span-2">
            {cameraError}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ScanResult({ result }: { result: SubmitScanResult }) {
  if (result.status === "SUCCESS") {
    return (
      <section className="rounded-lg border border-emerald-300 bg-emerald-100 p-6 text-emerald-950 shadow-sm">
        <div className="w-full">
          <p className="text-5xl font-black">VERIFICATION SUCCESSFUL</p>
          <dl className="mt-6 space-y-4 text-xl">
            <ResultRow label="Student ID" value={result.barcodeValue} />
            <ResultRow label="Time" value={formatDateTime(result.scannedAt)} />
          </dl>
        </div>
      </section>
    );
  }

  if (result.status === "DUPLICATE") {
    return (
      <section className="rounded-lg border border-red-300 bg-red-100 p-6 text-red-950 shadow-sm">
        <div className="w-full">
          <p className="text-5xl font-black">DUPLICATE</p>
          <dl className="mt-6 space-y-4 text-xl">
            <ResultRow label="Student ID" value={result.barcodeValue} />
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
      ? "INVALID ID"
      : result.status === "EVENT_CLOSED"
        ? "NO ACTIVE EVENT"
        : "SYSTEM ERROR";

  return (
    <section className="rounded-lg border border-yellow-300 bg-yellow-100 p-6 text-yellow-950 shadow-sm">
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
