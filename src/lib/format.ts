const MONTHS_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${MONTHS_ES[d.getMonth()]}/${d.getFullYear()}`;
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(iso)} · ${hh}:${mm}`;
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPhoneMx(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^52/, "");
  if (digits.length !== 10) return raw;
  return `+52 (${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}

export function daysBetween(a: string | Date, b: string | Date = new Date()): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.floor((db - da) / (1000 * 60 * 60 * 24));
}

export function daysUntilNextBirthday(birthIso: string): number {
  const today = new Date();
  const b = new Date(birthIso);
  const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next.setFullYear(today.getFullYear() + 1);
  }
  return Math.ceil((next.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
}

export function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}