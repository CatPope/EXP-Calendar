// Date utilities — KST friendly. Avoid timezone bugs by using YYYY-MM-DD strings.

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fromYMD(s: string): Date {
  const [y, m, d] = s.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(d.getDate() + n);
  return nd;
}

/** Build a 6-week grid (42 cells) for monthly calendar */
export function monthGrid(d: Date): Date[] {
  const first = startOfMonth(d);
  const start = addDays(first, -first.getDay()); // start from Sunday
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
  return cells;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function todayYMD(): string {
  return toYMD(new Date());
}

/** Returns ISO datetime string at 23:59 local time for a given YMD (for due_date) */
export function ymdToDueIso(ymd: string): string {
  const d = fromYMD(ymd);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

export function formatMonthHeader(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

export function weekdayLabel(i: number): string {
  return ["일", "월", "화", "수", "목", "금", "토"][i] || "";
}
