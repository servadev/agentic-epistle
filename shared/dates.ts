// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

/**
 * Consolidated date formatting utilities.
 *
 * Previously spread across `app/lib/utils.ts` (4 functions) and
 * `workers/lib/html.ts` (`formatEmailDate`). Now one canonical set
 * imported by both the frontend and backend.
 */

/** Parse safely — returns null on invalid dates instead of NaN-date. */
function safeParse(dateStr: string | undefined | null): Date | null {
	if (!dateStr) return null;
	try {
		const d = new Date(dateStr);
		return isNaN(d.getTime()) ? null : d;
	} catch {
		return null;
	}
}

/**
 * Email list rows.
 * - Today: "3:42 PM"
 * - This year: "Apr 15"
 * - Older: "Apr 15, 2024"
 */
export function formatListDate(dateStr: string): string {
	const date = safeParse(dateStr);
	if (!date) return dateStr;

	const now = new Date();
	if (date.toDateString() === now.toDateString()) {
		return date.toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
		});
	}
	if (date.getFullYear() === now.getFullYear()) {
		return date.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});
	}
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Email detail header.
 * "Tue, Apr 15, 3:42 PM"
 */
export function formatDetailDate(dateStr: string): string {
	const date = safeParse(dateStr);
	if (!date) return dateStr;

	return date.toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

/**
 * Thread message headers — time only.
 * "3:42 PM"
 */
export function formatShortDate(dateStr: string): string {
	const date = safeParse(dateStr);
	if (!date) return dateStr;

	return date.toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
}

/**
 * Compose quoted replies & backend quoted blocks.
 * "Tue, Apr 15, 2026, 3:42 PM"
 *
 * Uses explicit "en-US" locale for deterministic output on both browser
 * and Cloudflare Workers (which support `toLocaleString`).
 */
export function formatQuotedDate(dateStr: string | undefined): string {
	if (!dateStr) return "";
	const date = safeParse(dateStr);
	if (!date) return dateStr;

	return date.toLocaleString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

// ── Calendar Utilities ────────────────────────────────────────────────

export function startOfWeek(d: Date): Date {
	const date = new Date(d);
	date.setDate(date.getDate() - date.getDay());
	date.setHours(0, 0, 0, 0);
	return date;
}

export function addDays(d: Date, days: number): Date {
	const date = new Date(d.valueOf());
	date.setDate(date.getDate() + days);
	return date;
}

export function addMonths(d: Date, months: number): Date {
	const date = new Date(d.valueOf());
	date.setMonth(date.getMonth() + months);
	return date;
}

export function startOfMonth(d: Date): Date {
	const date = new Date(d);
	date.setDate(1);
	date.setHours(0, 0, 0, 0);
	return date;
}

export function endOfMonth(d: Date): Date {
	const date = new Date(d);
	date.setMonth(date.getMonth() + 1);
	date.setDate(0);
	date.setHours(23, 59, 59, 999);
	return date;
}

export function isSameDay(d1: Date, d2: Date): boolean {
	return (
		d1.getFullYear() === d2.getFullYear() &&
		d1.getMonth() === d2.getMonth() &&
		d1.getDate() === d2.getDate()
	);
}

export function startOfDay(d: Date): Date {
	const date = new Date(d);
	date.setHours(0, 0, 0, 0);
	return date;
}

export function endOfDay(d: Date): Date {
	const date = new Date(d);
	date.setHours(23, 59, 59, 999);
	return date;
}

export function formatShortTime(d: Date): string {
	return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatMonthYear(d: Date): string {
	return d.toLocaleDateString([], { month: "short", year: "numeric" });
}

export function formatDayName(d: Date): string {
	return d.toLocaleDateString([], { weekday: "short" });
}

export function formatDayNum(d: Date): string {
	return d.getDate().toString();
}

export function formatDateTime(d: Date): string {
	return d.toLocaleString([], {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}
