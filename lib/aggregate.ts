export type Granularity = 'daily' | 'weekly' | 'monthly'

function weekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function aggregateRows<T extends { date: string }>(rows: T[], granularity: Granularity): T[] {
  if (granularity === 'daily' || rows.length === 0) return rows

  const buckets = new Map<string, Record<string, unknown>>()

  for (const row of rows) {
    const key = granularity === 'weekly' ? weekStart(row.date) : monthKey(row.date)
    const r = row as Record<string, unknown>

    if (!buckets.has(key)) {
      buckets.set(key, { ...r, date: key })
    } else {
      const acc = buckets.get(key)!
      for (const k of Object.keys(r)) {
        if (k === 'date') continue
        const a = acc[k]
        const b = r[k]
        if (typeof a === 'number' && typeof b === 'number') acc[k] = a + b
      }
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => (a.date as string).localeCompare(b.date as string)) as unknown as T[]
}
