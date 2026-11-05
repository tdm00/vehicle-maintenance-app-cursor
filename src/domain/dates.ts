export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(now = new Date()): string {
  return formatISODate(now);
}

export function addMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const cursor = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  return formatISODate(new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, lastDay)));
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = parseISODate(fromIso).getTime();
  const to = parseISODate(toIso).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
