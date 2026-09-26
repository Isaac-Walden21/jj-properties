import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * SQLite `datetime('now')` text (UTC, no zone) shown in Michigan time. The zone is
 * fixed so the server (UTC) and the browser render the same string.
 */
export function formatWhen(sqliteUtc: string, dateOnly = false): string {
  return new Date(sqliteUtc.replace(" ", "T") + "Z").toLocaleString("en-US", {
    timeZone: "America/Detroit",
    dateStyle: dateOnly ? "short" : "medium",
    ...(dateOnly ? {} : { timeStyle: "short" }),
  });
}
