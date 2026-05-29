import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncActivityDay } from "@/lib/sync-activity"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { planId } = await params
  const { title } = await request.json()

  if (!title?.trim()) {
    return NextResponse.json({ error: "任务标题不能为空" }, { status: 400 })
  }

  const plan = await prisma.dailyPlan.findUnique({ where: { id: planId } })
  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 })
  }

  const maxSort = await prisma.task.findFirst({
    where: { dailyPlanId: planId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })

  const task = await prisma.task.create({
    data: {
      dailyPlanId: planId,
      title: title.trim(),
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
    },
  })

  await syncActivityDay(session.user.id, plan.date)
  return NextResponse.json(task, { status: 201 })
}
