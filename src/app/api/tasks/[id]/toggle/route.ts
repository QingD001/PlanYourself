import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { forbidden, handleRouteError, notFound, unauthorized } from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"
import { syncActivityDay } from "@/lib/sync-activity"

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { id } = await params
    const task = await prisma.task.findUnique({ where: { id } })
    if (!task) return notFound("任务不存在")

    const plan = await prisma.dailyPlan.findUnique({ where: { id: task.dailyPlanId } })
    if (!plan || plan.userId !== session.user.id) return forbidden()

    const newStatus = task.status === "completed" ? "todo" : "completed"
    const updated = await prisma.task.update({
      where: { id },
      data: {
        status: newStatus,
        completedAt: newStatus === "completed" ? new Date() : null,
      },
    })

    await syncActivityDay(session.user.id, plan.date)
    return NextResponse.json(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}
