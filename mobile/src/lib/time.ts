/**
 * Lightweight relative time formatting for chat lists and bubbles — no date
 * library needed.
 */

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function timeHM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Conversation-list timestamp: time today, "Yesterday", weekday, or date. */
export function formatListTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const today = startOfDay(new Date());
  const that = startOfDay(d);
  const diffDays = Math.round((today - that) / DAY_MS);

  if (diffDays <= 0) return timeHM(d);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return WEEKDAYS[d.getDay()];
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

/** Message-bubble timestamp: just HH:mm. */
export function formatMessageTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : timeHM(d);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Date-separator label: "Today", "Yesterday", or "12 Jun 2026". */
export function formatDayLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = startOfDay(new Date());
  const diffDays = Math.round((today - startOfDay(d)) / DAY_MS);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** True if two ISO timestamps fall on different calendar days. */
export function isDifferentDay(a: string, b: string): boolean {
  return startOfDay(new Date(a)) !== startOfDay(new Date(b));
}

/** "last seen" subtitle from a profile's last_seen. */
export function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return 'offline';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'offline';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) return 'last seen just now';
  if (diffMin < 60) return `last seen ${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `last seen ${diffH}h ago`;
  return `last seen ${formatListTime(iso)}`;
}
