import { prisma } from "@/lib/prisma"
import { startOfDay } from "date-fns"

export async function syncActivityDay(userId: string, date: Date) {
  const dayStart = startOfDay(date)

  const [plan, checkIn, reflection] = await Promise.all([
    prisma.dailyPlan.findUnique({
      where: { userId_date: { userId, date: dayStart } },
      include: { tasks: true },
    }),
    prisma.checkIn.findUnique({
      where: { userId_date: { userId, date: dayStart } },
    }),
    prisma.reflection.findUnique({
      where: { userId_date: { userId, date: dayStart } },
    }),
  ])

  const tasksPlanned = plan?.tasks.length ?? 0
  const tasksCompleted = plan?.tasks.filter((t) => t.status === "completed").length ?? 0

  let completionLevel = 0
  if (tasksPlanned > 0) {
    const ratio = tasksCompleted / tasksPlanned
    if (ratio >= 1) completionLevel = 4
    else if (ratio >= 0.75) completionLevel = 3
    else if (ratio >= 0.5) completionLevel = 2
    else if (ratio > 0) completionLevel = 1
  }

  await prisma.activityDay.upsert({
    where: { userId_date: { userId, date: dayStart } },
    create: {
      userId,
      date: dayStart,
      tasksPlanned,
      tasksCompleted,
      completionLevel,
      hasCheckIn: !!checkIn,
      hasReflection: !!reflection,
    },
    update: {
      tasksPlanned,
      tasksCompleted,
      completionLevel,
      hasCheckIn: !!checkIn,
      hasReflection: !!reflection,
    },
  })
}
