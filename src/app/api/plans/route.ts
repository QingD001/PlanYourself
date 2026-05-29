import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { handleRouteError, parseDateInput, readJsonBody, unauthorized } from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(request.url)
    const date = parseDateInput(searchParams.get("date"))

    const plan = await prisma.dailyPlan.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
      include: {
        tasks: { orderBy: { sortOrder: "asc" } },
      },
    })

    return NextResponse.json(plan ?? { date, tasks: [] })
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

    const existing = await prisma.dailyPlan.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    })
    if (existing) return NextResponse.json(existing)

    const plan = await prisma.dailyPlan.create({
      data: { userId: session.user.id, date },
      include: { tasks: true },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}
