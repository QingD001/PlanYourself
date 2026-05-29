import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { handleRouteError, notFound, unauthorized } from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { id, itemId } = await params
    const item = await prisma.collectionItem.findUnique({
      where: { id: itemId },
      select: { id: true, collectionId: true },
    })
    if (!item || item.collectionId !== id) return notFound("题目不存在")

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
    }

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
  } catch (error) {
    return handleRouteError(error)
  }
}
