import { NextResponse } from "next/server"
import { startOfDay } from "date-fns"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get("date")

  if (!dateStr) {
    return NextResponse.json({ error: "缺少日期参数" }, { status: 400 })
  }

  const date = startOfDay(new Date(dateStr))

  const plan = await prisma.dailyPlan.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
    include: {
      tasks: { orderBy: { sortOrder: "asc" } },
    },
  })

  return NextResponse.json(plan ?? { date, tasks: [] })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { date: dateStr } = await request.json()
  const date = startOfDay(new Date(dateStr))

  const existing = await prisma.dailyPlan.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  })
  if (existing) {
    return NextResponse.json(existing)
  }

  const plan = await prisma.dailyPlan.create({
    data: { userId: session.user.id, date },
    include: { tasks: true },
  })

  return NextResponse.json(plan, { status: 201 })
}
