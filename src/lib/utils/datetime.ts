// src/lib/utils/datetime.ts

/**
 * Format a UTC ISO string for display in a specific IANA timezone.
 * timeZone is required — always pass the clinic's timezone.
 */
export const formatDateTime = (utcIsoString: string, timeZone: string) => {
  if (!utcIsoString) return '';
  try {
    const date = new Date(utcIsoString);
    if (isNaN(date.getTime())) return utcIsoString;
    return date.toLocaleString(undefined, {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return utcIsoString;
  }
};

/**
 * Format only the time portion of a UTC ISO string in a specific IANA timezone.
 * timeZone is required — always pass the clinic's timezone.
 */
export const formatTimeOnly = (utcIsoString: string, timeZone: string) => {
  if (!utcIsoString) return '';
  try {
    const date = new Date(utcIsoString);
    if (isNaN(date.getTime())) return utcIsoString;
    return date.toLocaleTimeString(undefined, { timeZone, hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (e) {
    return utcIsoString;
  }
};

/**
 * Returns "YYYY-MM-DD" representing today's date in the given clinic timezone.
 * Use this instead of new Date().toISOString().split('T')[0] for clinic-aware "today".
 */
export const getClinicDateString = (timeZone: string): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

/**
 * Returns a Date offset so that its local (browser) methods return the
 * clinic-timezone values — useful only for calendar grid positioning.
 * Do NOT store or send this date anywhere; it is for display arithmetic only.
 */
export const toClinicDisplayDate = (utcIsoString: string, timeZone: string): Date => {
  const date = new Date(utcIsoString);
  const zonedString = date.toLocaleString('en-US', { timeZone });
  return new Date(zonedString);
};

export const getWeekDays = (date: Date) => {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(startOfWeek);
    current.setDate(startOfWeek.getDate() + i);
    days.push(current);
  }
  return days;
};

export const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};