import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { forbidden, handleRouteError, notFound, readJsonBody, unauthorized } from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"
import { syncActivityDay } from "@/lib/sync-activity"

type RouteContext = {
  params: Promise<{ id: string }>
}

async function getOwnedTask(id: string, userId: string) {
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return { task: null, plan: null }

  const plan = await prisma.dailyPlan.findUnique({ where: { id: task.dailyPlanId } })
  if (!plan || plan.userId !== userId) return { task, plan: null }

  return { task, plan }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { id } = await params
    const body = await readJsonBody(request)
    const { task, plan } = await getOwnedTask(id, session.user.id)
    if (!task) return notFound("任务不存在")
    if (!plan) return forbidden()

    const title = String(body.title ?? "").trim()
    if (!title) return NextResponse.json({ error: "任务标题不能为空" }, { status: 400 })

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title,
        description: body.description ? String(body.description) : null,
        priority: Number.isInteger(body.priority) ? Number(body.priority) : task.priority,
        estimatedMinutes: Number.isInteger(body.estimatedMinutes) ? Number(body.estimatedMinutes) : null,
      },
    })

    await syncActivityDay(session.user.id, plan.date)
    return NextResponse.json(updated)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { id } = await params
    const { task, plan } = await getOwnedTask(id, session.user.id)
    if (!task) return notFound("任务不存在")
    if (!plan) return forbidden()

    await prisma.task.delete({ where: { id } })
    await syncActivityDay(session.user.id, plan.date)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
