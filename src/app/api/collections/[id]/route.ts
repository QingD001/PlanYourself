import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  USER_COLLECTION_ITEM_LIMIT,
  canManageCollection,
  isAdmin,
} from "@/lib/permissions"
import { normalizeLevel } from "@/lib/learning-domains"
import { prisma } from "@/lib/prisma"

type IncomingItem = {
  id?: string
  title?: string
  url?: string
  type?: string
}

async function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { id } = await params
  const currentUser = await getUser(session.user.id)

  const collection = await prisma.learningCollection.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  })

  if (!collection) return NextResponse.json({ error: "题单不存在" }, { status: 404 })

  const subscribed = await prisma.collectionSubscription.findUnique({
    where: { userId_collectionId: { userId: session.user.id, collectionId: id } },
  })

  const progressEntries = await prisma.collectionProgress.findMany({
    where: { userId: session.user.id, collectionId: id },
  })

  const completedCount = progressEntries.filter((entry) => entry.completed).length
  const progressMap = new Map(progressEntries.map((entry) => [entry.collectionItemId, entry.completed]))
  const admin = isAdmin(currentUser)

  return NextResponse.json({
    ...collection,
    canManage: canManageCollection(currentUser, collection),
    isAdmin: admin,
    maxItemsPerCollection: admin ? null : USER_COLLECTION_ITEM_LIMIT,
    isSubscribed: !!subscribed,
    completedCount,
    items: collection.items.map((item) => ({
      ...item,
      completed: progressMap.get(item.id) ?? false,
    })),
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { id } = await params
  const currentUser = await getUser(session.user.id)
  const collection = await prisma.learningCollection.findUnique({ where: { id } })

  if (!collection) return NextResponse.json({ error: "题单不存在" }, { status: 404 })
  if (!canManageCollection(currentUser, collection)) {
    return NextResponse.json({ error: "无权修改该题单" }, { status: 403 })
  }

  const body = await request.json()
  const items = (Array.isArray(body.items) ? body.items : []) as IncomingItem[]
  const cleanItems = items
    .map((item) => ({
      id: item.id,
      title: String(item.title ?? "").trim(),
      url: item.url ? String(item.url).trim() : null,
      type: item.type ? String(item.type).trim() : "article",
    }))
    .filter((item) => item.title)

  if (!isAdmin(currentUser) && cleanItems.length > USER_COLLECTION_ITEM_LIMIT) {
    return NextResponse.json(
      { error: `普通用户每个题单最多只能包含 ${USER_COLLECTION_ITEM_LIMIT} 题` },
      { status: 403 }
    )
  }

  const keepIds = cleanItems
    .map((item) => item.id)
    .filter((itemId: unknown): itemId is string => typeof itemId === "string")

  const updated = await prisma.$transaction(async (tx) => {
    await tx.learningCollection.update({
      where: { id },
      data: {
        title: String(body.title ?? collection.title).trim(),
        description: body.description ? String(body.description).trim() : null,
        topic: String(body.topic ?? collection.topic).trim(),
        difficulty: normalizeLevel(body.difficulty),
        isPublic: typeof body.isPublic === "boolean" ? body.isPublic : collection.isPublic,
      },
    })

    await tx.collectionItem.deleteMany({
      where: {
        collectionId: id,
        ...(keepIds.length ? { id: { notIn: keepIds } } : {}),
      },
    })

    for (const [index, item] of cleanItems.entries()) {
      if (typeof item.id === "string") {
        await tx.collectionItem.update({
          where: { id: item.id },
          data: {
            title: item.title,
            url: item.url,
            type: item.type,
            sortOrder: index,
          },
        })
      } else {
        await tx.collectionItem.create({
          data: {
            collectionId: id,
            title: item.title,
            url: item.url,
            type: item.type,
            sortOrder: index,
          },
        })
      }
    }

    const itemCount = await tx.collectionItem.count({ where: { collectionId: id } })
    return tx.learningCollection.update({
      where: { id },
      data: { itemCount },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    })
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { id } = await params
  const currentUser = await getUser(session.user.id)
  const collection = await prisma.learningCollection.findUnique({ where: { id } })

  if (!collection) return NextResponse.json({ error: "题单不存在" }, { status: 404 })
  if (!canManageCollection(currentUser, collection)) {
    return NextResponse.json({ error: "无权删除该题单" }, { status: 403 })
  }

  await prisma.learningCollection.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
