import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { id, itemId } = await params

  const existing = await prisma.collectionProgress.findUnique({
    where: { userId_collectionItemId: { userId: session.user.id, collectionItemId: itemId } },
  })

  if (existing) {
    const updated = await prisma.collectionProgress.update({
      where: { userId_collectionItemId: { userId: session.user.id, collectionItemId: itemId } },
      data: {
        completed: !existing.completed,
        completedAt: !existing.completed ? new Date() : null,
      },
    })
    return NextResponse.json(updated)
  } else {
    const created = await prisma.collectionProgress.create({
      data: {
        userId: session.user.id,
        collectionId: id,
        collectionItemId: itemId,
        completed: true,
        completedAt: new Date(),
      },
    })
    return NextResponse.json(created)
  }
}
