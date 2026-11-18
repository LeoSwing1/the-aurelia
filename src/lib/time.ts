export const HOTEL_TIME_ZONE = "Asia/Kolkata";

export function formatHotelDateTime(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: HOTEL_TIME_ZONE,
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
    ...options,
  }).format(date) + " IST";
}

export function formatHotelDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone: HOTEL_TIME_ZONE, day: "2-digit", month: "short", year: "numeric" }).format(date);
}
