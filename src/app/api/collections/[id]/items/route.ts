import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  USER_COLLECTION_ITEM_LIMIT,
  canManageCollection,
  isAdmin,
} from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { id } = await params
  const { title, url, type } = await request.json()

  const [collection, currentUser] = await Promise.all([
    prisma.learningCollection.findUnique({ where: { id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    }),
  ])

  if (!collection) return NextResponse.json({ error: "题单不存在" }, { status: 404 })
  if (!canManageCollection(currentUser, collection)) {
    return NextResponse.json({ error: "无权修改该题单" }, { status: 403 })
  }

  if (!isAdmin(currentUser)) {
    const itemCount = await prisma.collectionItem.count({ where: { collectionId: id } })
    if (itemCount >= USER_COLLECTION_ITEM_LIMIT) {
      return NextResponse.json(
        { error: `普通用户每个题单最多只能包含 ${USER_COLLECTION_ITEM_LIMIT} 题` },
        { status: 403 }
      )
    }
  }

  const maxSort = await prisma.collectionItem.findFirst({
    where: { collectionId: id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })

  const item = await prisma.collectionItem.create({
    data: {
      collectionId: id,
      title,
      url,
      type: type ?? "article",
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
    },
  })

  await prisma.learningCollection.update({
    where: { id },
    data: { itemCount: { increment: 1 } },
  })

  return NextResponse.json(item, { status: 201 })
}
