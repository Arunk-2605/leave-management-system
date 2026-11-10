export async function calculateWorkingDays(start: string, end: string, prisma: any): Promise<number> {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
  if (endDate < startDate) return 0;
  const holidays = await prisma.publicHoliday.findMany();
  const holidaySet = new Set(holidays.map((h: any) => new Date(h.date).toDateString()));
  let count = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 0 || day === 6) continue; // weekend
    if (holidaySet.has(d.toDateString())) continue; // public holiday
    count++;
  }
  return count;
}
