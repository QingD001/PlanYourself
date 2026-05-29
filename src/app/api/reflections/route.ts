import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  handleRouteError,
  parseDateInput,
  parsePositiveInt,
  readJsonBody,
  unauthorized,
} from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"
import { syncActivityDay } from "@/lib/sync-activity"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get("date")

    if (dateStr) {
      const date = parseDateInput(dateStr)
      const reflection = await prisma.reflection.findUnique({
        where: { userId_date: { userId: session.user.id, date } },
      })
      return NextResponse.json(reflection ?? { date })
    }

    const page = parsePositiveInt(searchParams.get("page"), 1, 1000)
    const limit = parsePositiveInt(searchParams.get("limit"), 20, 100)

    const reflections = await prisma.reflection.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.reflection.count({ where: { userId: session.user.id } })

    return NextResponse.json({ reflections, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await readJsonBody(request)
    const date = parseDateInput(body.date)
    const content = String(body.content ?? "").trim()
    if (!content) return NextResponse.json({ error: "复盘内容不能为空" }, { status: 400 })

    const userId = session.user.id
    const reflection = await prisma.reflection.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        content,
        productivity: typeof body.productivity === "number" ? body.productivity : null,
        focus: typeof body.focus === "number" ? body.focus : null,
        learningSummary: body.learningSummary ? String(body.learningSummary) : null,
        aiPrompt: body.aiPrompt ? String(body.aiPrompt) : null,
      },
      update: {
        content,
        productivity: typeof body.productivity === "number" ? body.productivity : null,
        focus: typeof body.focus === "number" ? body.focus : null,
        learningSummary: body.learningSummary ? String(body.learningSummary) : null,
        aiPrompt: body.aiPrompt ? String(body.aiPrompt) : null,
      },
    })

    await syncActivityDay(userId, date)
    return NextResponse.json(reflection)
  } catch (error) {
    return handleRouteError(error)
  }
}
