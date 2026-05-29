import { NextResponse } from "next/server"
import { startOfDay } from "date-fns"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncActivityDay } from "@/lib/sync-activity"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get("date")

  if (dateStr) {
    const date = startOfDay(new Date(dateStr))
    const reflection = await prisma.reflection.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
    })
    return NextResponse.json(reflection ?? { date })
  }

  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "20")

  const reflections = await prisma.reflection.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  })

  const total = await prisma.reflection.count({ where: { userId: session.user.id } })

  return NextResponse.json({ reflections, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { date: dateStr, content, productivity, focus, learningSummary, aiPrompt } =
    await request.json()

  const date = startOfDay(new Date(dateStr))
  const userId = session.user.id

  const reflection = await prisma.reflection.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, content, productivity, focus, learningSummary, aiPrompt },
    update: { content, productivity, focus, learningSummary, aiPrompt },
  })

  await syncActivityDay(userId, date)
  return NextResponse.json(reflection)
}
