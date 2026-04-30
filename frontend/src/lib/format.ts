import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";

export function formatGameDate(value: string | Date): string {
  const d = typeof value === "string" ? parseISO(value.replace(" ", "T")) : value;
  if (!isValid(d)) return String(value);
  return format(d, "EEE dd 'de' MMM • HH:mm'hs'", { locale: es });
}

export function formatGameDateShort(value: string | Date): string {
  const d = typeof value === "string" ? parseISO(value.replace(" ", "T")) : value;
  if (!isValid(d)) return String(value);
  return format(d, "dd MMM • HH:mm", { locale: es });
}

export function nextWednesdayISO(): string {
  const today = new Date();
  const day = today.getDay();
  const offset = ((3 - day + 7) % 7 || 7);
  const next = new Date(today);
  next.setDate(today.getDate() + offset);
  return format(next, "yyyy-MM-dd");
}
