import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getStreak } from "@/lib/streak"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const stats = await getStreak(session.user.id)
  return NextResponse.json(stats)
}
