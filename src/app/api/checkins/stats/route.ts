import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { handleRouteError, unauthorized } from "@/lib/route-helpers"
import { getStreak } from "@/lib/streak"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const stats = await getStreak(session.user.id)
    return NextResponse.json(stats)
  } catch (error) {
    return handleRouteError(error)
  }
}
