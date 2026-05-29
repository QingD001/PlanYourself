import { prisma } from "@/lib/prisma"
import { startOfDay, subDays } from "date-fns"

export async function getStreak(userId: string) {
  const today = startOfDay(new Date())

  const checkIns = await prisma.checkIn.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: { date: true },
  })

  const days = new Set(checkIns.map((c) => c.date.toISOString().split("T")[0]))

  let currentStreak = 0
  let checkDate = today

  while (days.has(checkDate.toISOString().split("T")[0])) {
    currentStreak++
    checkDate = subDays(checkDate, 1)
  }

  if (currentStreak === 0) {
    checkDate = subDays(today, 1)
    while (days.has(checkDate.toISOString().split("T")[0])) {
      currentStreak++
      checkDate = subDays(checkDate, 1)
    }
  }

  let longestStreak = 0
  let tempStreak = 0
  const sortedDates = checkIns.map((c) => c.date).sort((a, b) => a.getTime() - b.getTime())

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1
    } else {
      const diff =
        (startOfDay(sortedDates[i]).getTime() - startOfDay(sortedDates[i - 1]).getTime()) /
        (1000 * 60 * 60 * 24)
      if (diff === 1) {
        tempStreak++
      } else {
        tempStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak)
  }

  return {
    currentStreak,
    longestStreak,
    totalCheckIns: checkIns.length,
    todayCheckedIn: days.has(today.toISOString().split("T")[0]),
  }
}
