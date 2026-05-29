import { NextResponse } from "next/server"
import { startOfDay } from "date-fns"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncActivityDay } from "@/lib/sync-activity"

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
  const checkIn = await prisma.checkIn.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  })

  return NextResponse.json(checkIn ?? { date })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { date: dateStr, mood, energy, note } = await request.json()

  const date = startOfDay(new Date(dateStr))
  const userId = session.user.id

  const checkIn = await prisma.checkIn.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, mood, energy, note },
    update: { mood, energy, note },
  })

  await syncActivityDay(userId, date)
  return NextResponse.json(checkIn)
}
