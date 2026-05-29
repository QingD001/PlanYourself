import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  USER_COLLECTION_ITEM_LIMIT,
  USER_COLLECTION_LIMIT,
  isAdmin,
} from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  })
  const collectionCount = await prisma.learningCollection.count({
    where: { creatorId: session.user.id },
  })
  const admin = isAdmin(user)

  return NextResponse.json({
    isAdmin: admin,
    collectionCount,
    maxCollections: admin ? null : USER_COLLECTION_LIMIT,
    maxItemsPerCollection: admin ? null : USER_COLLECTION_ITEM_LIMIT,
    canCreateCollection: admin || collectionCount < USER_COLLECTION_LIMIT,
  })
}
