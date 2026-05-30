import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { handleRouteError, readJsonBody, unauthorized } from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"

const FALLBACK_ADMIN_EMAIL = "zhengjinlin001@ruc.edu.cn"

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await readJsonBody(request)
    const confirmEmail = String(body.email ?? "").trim().toLowerCase()
    const sessionEmail = session.user.email?.trim().toLowerCase()
    if (!sessionEmail || confirmEmail !== sessionEmail) {
      return NextResponse.json({ error: "请输入当前账号邮箱以确认注销" }, { status: 400 })
    }

    const userId = session.user.id
    const admin = await prisma.user.findUnique({
      where: { email: FALLBACK_ADMIN_EMAIL },
      select: { id: true },
    })
    if (!admin) {
      return NextResponse.json({ error: "无法注销：未找到题单接收管理员账号" }, { status: 500 })
    }

    await prisma.userProfile.deleteMany({ where: { userId } })
    await prisma.aIInsight.deleteMany({ where: { userId } })
    await prisma.activityDay.deleteMany({ where: { userId } })
    await prisma.collectionSubscription.deleteMany({ where: { userId } })
    await prisma.collectionProgress.deleteMany({ where: { userId } })
    await prisma.task.deleteMany({ where: { dailyPlan: { userId } } })
    await prisma.dailyPlan.deleteMany({ where: { userId } })
    await prisma.checkIn.deleteMany({ where: { userId } })
    await prisma.reflection.deleteMany({ where: { userId } })
    await prisma.learningCollection.updateMany({
      where: { creatorId: userId },
      data: { creatorId: admin.id },
    })
    await prisma.user.delete({ where: { id: userId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
