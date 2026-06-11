"use server";

import { redirect } from "next/navigation";

import { getActiveEvent } from "@/lib/repositories/events";
import { findUserById } from "@/lib/repositories/users";
import {
  createDuplicateAttempt,
  createScan,
  findOriginalScan,
  isUniqueViolation,
} from "@/lib/repositories/scans";
import { createAuditLog } from "@/lib/repositories/audit-logs";
import { getSessionUserId } from "@/lib/session";

export type SubmitScanResult =
  | {
      status: "SUCCESS";
      barcodeValue: string;
      scannedAt: string;
    }
  | {
      status: "DUPLICATE";
      barcodeValue: string;
      originalScannedBy: string;
      originalScannedAt: string;
      duplicateAttemptedBy: string;
      duplicateAttemptedAt: string;
    }
  | {
      status: "INVALID_FORMAT" | "EVENT_CLOSED" | "USER_DISABLED" | "ERROR";
      message: string;
    };

const BARCODE_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_BARCODE_LENGTH = 100;

export async function submitScanAction(
  formData: FormData,
): Promise<SubmitScanResult> {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  const user = await findUserById(userId);

  if (!user?.isActive) {
    return {
      status: "USER_DISABLED",
      message: "Your account is disabled. Contact an administrator.",
    };
  }

  const barcodeValue = String(formData.get("barcodeValue") ?? "").trim();
  const deviceId = getOptionalFormValue(formData, "deviceId");
  const location = getOptionalFormValue(formData, "location");
  const barcodeValidationMessage = validateBarcode(barcodeValue);

  if (barcodeValidationMessage) {
    return {
      status: "INVALID_FORMAT",
      message: barcodeValidationMessage,
    };
  }

  const activeEvent = await getActiveEvent();

  if (!activeEvent) {
    return {
      status: "EVENT_CLOSED",
      message: "No active event is available for scanning.",
    };
  }

  try {
    const scan = await createScan({
      eventId: activeEvent.id,
      barcodeValue,
      scannedByUserId: user.id,
      deviceId,
      location,
    });
    await createAuditLog({
      userId: user.id,
      action: "SCAN_SUCCESS",
      details: {
        eventId: activeEvent.id,
        barcodeValue,
        scanId: scan.id,
        deviceId,
        location,
      },
    });

    return {
      status: "SUCCESS",
      barcodeValue: scan.barcodeValue,
      scannedAt: scan.scannedAt.toISOString(),
    };
  } catch (error) {
    if (!isUniqueViolation(error)) {
      return {
        status: "ERROR",
        message: "Could not save the scan. Try again.",
      };
    }

    const originalScan = await findOriginalScan(activeEvent.id, barcodeValue);
    const duplicateAttempt = await createDuplicateAttempt({
      eventId: activeEvent.id,
      barcodeValue,
      attemptedByUserId: user.id,
      originalScanId: originalScan?.id,
      deviceId,
      location,
    });
    await createAuditLog({
      userId: user.id,
      action: "SCAN_DUPLICATE",
      details: {
        eventId: activeEvent.id,
        barcodeValue,
        originalScanId: originalScan?.id,
        duplicateAttemptId: duplicateAttempt.id,
        deviceId,
        location,
      },
    });

    return {
      status: "DUPLICATE",
      barcodeValue,
      originalScannedBy: formatUserName(
        originalScan?.scannedByFullName,
        originalScan?.scannedByUsername,
      ),
      originalScannedAt:
        originalScan?.scannedAt.toISOString() ?? duplicateAttempt.attemptedAt.toISOString(),
      duplicateAttemptedBy: formatUserName(user.fullName, user.username),
      duplicateAttemptedAt: duplicateAttempt.attemptedAt.toISOString(),
    };
  }
}

function validateBarcode(barcodeValue: string): string | null {
  if (!barcodeValue) {
    return "Barcode is required.";
  }

  if (barcodeValue.length > MAX_BARCODE_LENGTH) {
    return "Barcode must be 100 characters or fewer.";
  }

  if (!BARCODE_PATTERN.test(barcodeValue)) {
    return "Barcode can only contain letters, numbers, hyphens, and underscores.";
  }

  return null;
}

function getOptionalFormValue(
  formData: FormData,
  fieldName: string,
): string | undefined {
  const value = String(formData.get(fieldName) ?? "").trim();

  return value || undefined;
}

function formatUserName(
  fullName: string | null | undefined,
  username: string | null | undefined,
): string {
  return fullName || username || "Unknown user";
}
