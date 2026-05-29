import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { forbidden, handleRouteError, readJsonBody, unauthorized } from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"
import { syncActivityDay } from "@/lib/sync-activity"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { planId } = await params
    const body = await readJsonBody(request)
    const title = String(body.title ?? "").trim()
    if (!title) return NextResponse.json({ error: "任务标题不能为空" }, { status: 400 })

    const plan = await prisma.dailyPlan.findUnique({ where: { id: planId } })
    if (!plan || plan.userId !== session.user.id) return forbidden()

    const maxSort = await prisma.task.findFirst({
      where: { dailyPlanId: planId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    })

    const task = await prisma.task.create({
      data: {
        dailyPlanId: planId,
        title,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
    })

    await syncActivityDay(session.user.id, plan.date)
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}
