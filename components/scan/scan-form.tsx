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
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const isSubmittingRef = useRef(false);
  const lastDetectedRef = useRef<{ value: string; time: number } | null>(null);
  const [result, setResult] = useState<SubmitScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    inputRef.current?.focus();

    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!isCameraOpen || !videoRef.current || !streamRef.current) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = streamRef.current;

    video
      .play()
      .then(() => {
        if (detectorRef.current) {
          detectFromCamera(detectorRef.current);
        }
      })
      .catch(() => {
        setCameraError("Could not start the camera preview.");
        stopCamera();
      });
    // The detector loop is intentionally started only when the camera view opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOpen]);

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function submitBarcode(barcodeValue: string) {
    const trimmedBarcode = barcodeValue.trim();

    if (!trimmedBarcode || isSubmittingRef.current) {
      focusInput();
      return;
    }

    isSubmittingRef.current = true;
    const formData = new FormData();
    formData.set("barcodeValue", trimmedBarcode);

    startTransition(async () => {
      try {
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
      } finally {
        isSubmittingRef.current = false;
        focusInput();
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitBarcode(inputRef.current?.value ?? "");
  }

  async function openCamera() {
    setCameraError(null);
    setIsCameraStarting(true);

    if (!window.BarcodeDetector) {
      setCameraError("Camera barcode scanning is not supported in this browser.");
      setIsCameraStarting(false);
      focusInput();
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch {
      setCameraError("Camera access was blocked or unavailable.");
      stopCamera();
      focusInput();
    } finally {
      setIsCameraStarting(false);
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
        const now = Date.now();
        const lastDetected = lastDetectedRef.current;

        if (
          lastDetected?.value === barcodeValue &&
          now - lastDetected.time < 2500
        ) {
          animationFrameRef.current = window.requestAnimationFrame(() => {
            void detectFromCamera(detector);
          });
          return;
        }

        lastDetectedRef.current = { value: barcodeValue, time: now };

        if (inputRef.current) {
          inputRef.current.value = barcodeValue;
        }

        submitBarcode(barcodeValue);
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
    detectorRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOpen(false);
  }

  return (
    <section className="grid flex-1 gap-5 lg:grid-cols-[3fr_1fr]">
      <div className="flex min-h-[58vh] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950 shadow-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-300">
              Camera scanner
            </p>
            <p className="text-xs text-zinc-400">
              {isCameraOpen ? "Scanning continuously" : "Camera closed"}
            </p>
          </div>
          <button
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            type="button"
            disabled={isPending || isCameraStarting}
            onClick={isCameraOpen ? stopCamera : openCamera}
          >
            {isCameraStarting
              ? "Starting..."
              : isCameraOpen
                ? "Close Camera"
                : "Open Camera"}
          </button>
        </div>

        <div className="relative flex flex-1 items-center justify-center bg-black">
          {isCameraOpen ? (
            <video
              ref={videoRef}
              className="h-full min-h-[52vh] w-full object-cover"
              muted
              playsInline
            />
          ) : (
            <div className="px-6 text-center text-white">
              <p className="text-4xl font-bold">CAMERA READY</p>
            </div>
          )}
          {isCameraOpen ? (
            <div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
          ) : null}
        </div>

        {cameraError ? (
          <div className="border-t border-yellow-400/30 bg-yellow-100 px-4 py-3 text-sm text-yellow-950">
            {cameraError}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-5">
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
              className="mt-2 h-14 w-full rounded-md border-2 border-zinc-300 px-3 text-2xl font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
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
            className="mt-4 h-12 w-full rounded-md bg-zinc-950 px-4 text-base font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Submit"}
          </button>
        </form>

        {result ? <ScanResult result={result} /> : <ReadyState />}
      </div>
    </section>
  );
}

function ReadyState() {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-3xl font-bold">READY</p>
      </div>
    </section>
  );
}

function ScanResult({ result }: { result: SubmitScanResult }) {
  if (result.status === "SUCCESS") {
    return (
      <section className="rounded-lg border border-emerald-300 bg-emerald-100 p-5 text-emerald-950 shadow-sm">
        <div className="w-full">
          <p className="text-4xl font-black">VALID SCAN</p>
          <dl className="mt-5 space-y-3 text-lg">
            <ResultRow label="Barcode" value={result.barcodeValue} />
            <ResultRow label="Time" value={formatDateTime(result.scannedAt)} />
          </dl>
        </div>
      </section>
    );
  }

  if (result.status === "DUPLICATE") {
    return (
      <section className="rounded-lg border border-red-300 bg-red-100 p-5 text-red-950 shadow-sm">
        <div className="w-full">
          <p className="text-4xl font-black">DUPLICATE</p>
          <dl className="mt-5 space-y-3 text-lg">
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
    <section className="rounded-lg border border-yellow-300 bg-yellow-100 p-5 text-yellow-950 shadow-sm">
      <div>
        <p className="text-4xl font-black">{title}</p>
        <p className="mt-4 text-lg">{result.message}</p>
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
