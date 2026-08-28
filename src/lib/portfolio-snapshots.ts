import { prisma } from "@/lib/db";
import type { PerformancePoint } from "@/lib/portfolio-performance";

export function utcDayStart(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

function utcDayKey(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export async function upsertTodaySnapshots(
  userId: string,
  series: Record<string, PerformancePoint[]>
): Promise<void> {
  const today = utcDayStart(new Date());

  for (const [currency, points] of Object.entries(series)) {
    const last = points[points.length - 1];
    if (!last) continue;

    await prisma.portfolioSnapshot.upsert({
      where: {
        userId_date_currency: { userId, date: today, currency },
      },
      create: {
        userId,
        date: today,
        currency,
        value: last.value,
      },
      update: { value: last.value },
    });
  }
}

export async function getSnapshotsForRange(
  userId: string,
  from: Date,
  to: Date
): Promise<Record<string, { date: Date; value: number }[]>> {
  const rows = await prisma.portfolioSnapshot.findMany({
    where: {
      userId,
      date: { gte: utcDayStart(from), lte: utcDayStart(to) },
    },
    orderBy: { date: "asc" },
  });

  const byCurrency: Record<string, { date: Date; value: number }[]> = {};
  for (const row of rows) {
    if (!byCurrency[row.currency]) byCurrency[row.currency] = [];
    byCurrency[row.currency].push({ date: row.date, value: row.value });
  }
  return byCurrency;
}

/** Prefer stored daily snapshots when available for a given UTC day. */
export function mergeSeriesWithSnapshots(
  computed: PerformancePoint[],
  snapshots: { date: Date; value: number }[]
): PerformancePoint[] {
  if (!computed.length || !snapshots.length) return computed;

  const snapByDay = new Map(
    snapshots.map((s) => [utcDayKey(s.date.getTime()), s.value])
  );

  let usedSnapshots = false;
  const merged = computed.map((p) => {
    const snap = snapByDay.get(utcDayKey(p.t));
    if (snap != null) {
      usedSnapshots = true;
      return { t: p.t, value: snap };
    }
    return p;
  });

  return usedSnapshots ? merged : computed;
}
