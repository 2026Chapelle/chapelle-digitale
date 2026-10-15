const OPENING_HOUR = 18

function abidjanDateAndMinute(now: Date, timeZone: string) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(({ type, value }) => [type, value]))

  return { date: `${values.year}-${values.month}-${values.day}`, minute: Number(values.hour) * 60 + Number(values.minute) }
}

function previousDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const previous = new Date(Date.UTC(year, month - 1, day - 1))
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}-${String(previous.getUTCDate()).padStart(2, '0')}`
}

export function isMahanaimDayUnlocked(dayDate: string, dayNumber: number, now: Date, timeZone = 'Africa/Abidjan') {
  if (dayNumber === 1) return true
  const local = abidjanDateAndMinute(now, timeZone)
  const openingDate = previousDate(dayDate)
  return local.date > openingDate || (local.date === openingDate && local.minute >= OPENING_HOUR * 60)
}
