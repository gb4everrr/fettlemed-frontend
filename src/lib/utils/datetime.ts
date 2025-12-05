// src/lib/utils/datetime.ts

export const formatDateTime = (utcIsoString: string, timeZone: string = 'Asia/Kolkata') => {
  if (!utcIsoString) return '';
  try {
    const date = new Date(utcIsoString);
    if (isNaN(date.getTime())) return utcIsoString;
    return date.toLocaleString(undefined, {
      timeZone: timeZone,
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

export const formatTimeOnly = (utcIsoString: string, timeZone: string = 'Asia/Kolkata') => {
  if (!utcIsoString) return '';
  try {
    const date = new Date(utcIsoString);
    if (isNaN(date.getTime())) return utcIsoString;
    return date.toLocaleTimeString(undefined, { timeZone, hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (e) {
    return utcIsoString;
  }
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