/**
 * Indian Standard Time (Asia/Kolkata) Date & Time Utilities
 * Computes business open/closed status, holiday checks, and announcement gating in IST.
 */

export interface IstCurrent {
  dateStr: string; // YYYY-MM-DD
  dayName: string; // Monday, Tuesday, etc.
  timeStr: string; // HH:mm
  isoString: string;
}

export function getIstCurrent(): IstCurrent {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(now);

  const getPart = (type: string) => parts.find(p => p.type === type)?.value || "";
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const weekday = getPart("weekday");
  const hour = getPart("hour");
  const minute = getPart("minute");

  return {
    dateStr: `${year}-${month}-${day}`,
    dayName: weekday,
    timeStr: `${hour}:${minute}`,
    isoString: now.toISOString()
  };
}

export interface StoreOpenStatus {
  isOpen: boolean;
  message: string;
  isHoliday: boolean;
}

export function calculateStoreOpenStatus(
  hours?: Record<string, { open: string; close: string; closed?: boolean }>,
  holidays?: Array<{ date: string; label?: string } | string>
): StoreOpenStatus {
  if (!hours) {
    return { isOpen: true, message: "Open today", isHoliday: false };
  }

  const { dateStr, dayName, timeStr } = getIstCurrent();

  // Check holiday list
  if (Array.isArray(holidays)) {
    const isHol = holidays.some(h => (typeof h === "string" ? h : h.date) === dateStr);
    if (isHol) {
      return { isOpen: false, message: "Closed for Holiday", isHoliday: true };
    }
  }

  const todayHours = hours[dayName];
  if (!todayHours || todayHours.closed) {
    return { isOpen: false, message: `Closed on ${dayName}s`, isHoliday: false };
  }

  const { open, close } = todayHours;
  if (!open || !close) {
    return { isOpen: true, message: "Open today", isHoliday: false };
  }

  // Compare "HH:mm" strings directly
  if (timeStr >= open && timeStr <= close) {
    return { isOpen: true, message: `Open until ${close} IST`, isHoliday: false };
  } else if (timeStr < open) {
    return { isOpen: false, message: `Opens today at ${open} IST`, isHoliday: false };
  } else {
    return { isOpen: false, message: `Closed (opened until ${close} IST)`, isHoliday: false };
  }
}

export function isAnnouncementActive(
  startsAt?: string | number,
  endsAt?: string | number
): boolean {
  const now = Date.now();

  if (startsAt) {
    const startMs = typeof startsAt === "number" ? startsAt : new Date(startsAt).getTime();
    if (!isNaN(startMs) && now < startMs) return false;
  }

  if (endsAt) {
    const endMs = typeof endsAt === "number" ? endsAt : new Date(endsAt).getTime();
    if (!isNaN(endMs) && now > endMs) return false;
  }

  return true;
}
