import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { parseDateInput, handleRouteError, readJsonBody, unauthorized } from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"
import { syncActivityDay } from "@/lib/sync-activity"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(request.url)
    const date = parseDateInput(searchParams.get("date"))
    const checkIn = await prisma.checkIn.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
    })

    return NextResponse.json(checkIn ?? { date })
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
    const mood = Number(body.mood)
    const energy = Number(body.energy)
    if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
      return NextResponse.json({ error: "心情评分必须在 1 到 5 之间" }, { status: 400 })
    }
    if (!Number.isInteger(energy) || energy < 1 || energy > 5) {
      return NextResponse.json({ error: "能量评分必须在 1 到 5 之间" }, { status: 400 })
    }

    const userId = session.user.id
    const checkIn = await prisma.checkIn.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, mood, energy, note: body.note ? String(body.note) : null },
      update: { mood, energy, note: body.note ? String(body.note) : null },
    })

    await syncActivityDay(userId, date)
    return NextResponse.json(checkIn)
  } catch (error) {
    return handleRouteError(error)
  }
}
