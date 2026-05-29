import { NextResponse } from "next/server"
import { startOfYear, endOfYear } from "date-fns"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const yearStr = searchParams.get("year") ?? String(new Date().getFullYear())
  const year = parseInt(yearStr)

  const from = startOfYear(new Date(year, 0, 1))
  const to = endOfYear(new Date(year, 11, 31))

  const days = await prisma.activityDay.findMany({
    where: {
      userId: session.user.id,
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
  })

  return NextResponse.json(days)
}
