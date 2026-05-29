import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  USER_COLLECTION_ITEM_LIMIT,
  USER_COLLECTION_LIMIT,
  canManageCollection,
  isAdmin,
} from "@/lib/permissions"
import { normalizeLevel } from "@/lib/learning-domains"
import { badRequest, handleRouteError, readJsonBody, unauthorized } from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"

type IncomingItem = { title?: string; url?: string; type?: string }

async function getCurrentUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const userId = session.user.id
    const currentUser = await getCurrentUser(userId)
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
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    const userId = session.user.id

    const currentUser = await getCurrentUser(userId)
    if (!isAdmin(currentUser)) {
      const count = await prisma.learningCollection.count({ where: { creatorId: userId } })
      if (count >= USER_COLLECTION_LIMIT) {
        return NextResponse.json(
          { error: `普通用户最多只能创建 ${USER_COLLECTION_LIMIT} 个题单` },
          { status: 403 }
        )
      }
    }

    const body = await readJsonBody(request)
    const title = String(body.title ?? "").trim()
    const topic = String(body.topic ?? "").trim()
    if (!title) return badRequest("题单标题不能为空")
    if (!topic) return badRequest("题单方向不能为空")

    const rawItems = Array.isArray(body.items) ? body.items : []
    const cleanItems = rawItems
      .map((item) => {
        const row = item as IncomingItem
        return {
          title: String(row.title ?? "").trim(),
          url: row.url ? String(row.url).trim() : null,
          type: row.type ? String(row.type).trim() : "article",
        }
      })
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
        description: body.description ? String(body.description).trim() : null,
        topic,
        difficulty: normalizeLevel(typeof body.difficulty === "string" ? body.difficulty : undefined),
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
  } catch (error) {
    return handleRouteError(error)
  }
}
