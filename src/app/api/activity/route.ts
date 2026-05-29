import { NextResponse } from "next/server"
import { startOfYear, endOfYear } from "date-fns"
import { auth } from "@/lib/auth"
import { handleRouteError, unauthorized } from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(request.url)
    const yearStr = searchParams.get("year") ?? String(new Date().getFullYear())
    const year = Number.parseInt(yearStr, 10)
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "年份参数不正确" }, { status: 400 })
    }

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
  } catch (error) {
    return handleRouteError(error)
  }
}
