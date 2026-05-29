import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  USER_COLLECTION_ITEM_LIMIT,
  USER_COLLECTION_LIMIT,
  canManageCollection,
  isAdmin,
} from "@/lib/permissions"
import { normalizeLevel } from "@/lib/learning-domains"
import { prisma } from "@/lib/prisma"

type IncomingItem = { title?: string; url?: string; type?: string }

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const userId = session.user.id
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })

  const { searchParams } = new URL(request.url)
  const topic = searchParams.get("topic")
  const difficulty = searchParams.get("difficulty")
  const tab = searchParams.get("tab")

  const where: Record<string, unknown> = { isPublic: true }
  if (topic) where.topic = topic
  if (difficulty) where.difficulty = normalizeLevel(difficulty)

  if (tab === "subscribed") {
    const subs = await prisma.collectionSubscription.findMany({
      where: { userId },
      include: {
        collection: {
          include: {
            items: {
              select: { id: true },
            },
          },
        },
      },
    })

    const collections = await Promise.all(
      subs.map(async (sub) => {
        const completed = await prisma.collectionProgress.count({
          where: {
            userId,
            collectionId: sub.collectionId,
            completed: true,
          },
        })
        return {
          ...sub.collection,
          itemCount: sub.collection.items.length,
          completedCount: completed,
          isSubscribed: true,
          canManage: canManageCollection(currentUser, sub.collection),
          items: undefined,
        }
      })
    )

    return NextResponse.json(collections)
  }

  const collections = await prisma.learningCollection.findMany({
    where,
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const result = await Promise.all(
    collections.map(async (collection) => {
      const completed = await prisma.collectionProgress.count({
        where: { userId, collectionId: collection.id, completed: true },
      })
      const subscribed = await prisma.collectionSubscription.findUnique({
        where: { userId_collectionId: { userId, collectionId: collection.id } },
      })
      return {
        ...collection,
        itemCount: collection._count.items,
        completedCount: completed,
        isSubscribed: !!subscribed,
        canManage: canManageCollection(currentUser, collection),
        _count: undefined,
      }
    })
  )

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const userId = session.user.id

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })
  if (!isAdmin(currentUser)) {
    const count = await prisma.learningCollection.count({ where: { creatorId: userId } })
    if (count >= USER_COLLECTION_LIMIT) {
      return NextResponse.json(
        { error: `普通用户最多只能创建 ${USER_COLLECTION_LIMIT} 个题单` },
        { status: 403 }
      )
    }
  }

  const { title, description, topic, difficulty, items } = await request.json()
  const cleanItems = (Array.isArray(items) ? items : [])
    .map((item: IncomingItem) => ({
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

  const collection = await prisma.learningCollection.create({
    data: {
      creatorId: userId,
      title,
      description,
      topic,
      difficulty: normalizeLevel(difficulty),
      itemCount: cleanItems.length,
      items: {
        create: cleanItems.map((item, index) => ({
          title: item.title,
          url: item.url,
          type: item.type,
          sortOrder: index,
        })),
      },
    },
    include: { items: true },
  })

  return NextResponse.json(collection, { status: 201 })
}
