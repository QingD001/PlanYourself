import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  USER_COLLECTION_ITEM_LIMIT,
  canManageCollection,
  isAdmin,
} from "@/lib/permissions"
import { normalizeLevel } from "@/lib/learning-domains"
import { normalizeCollectionType } from "@/lib/collection-types"
import { validateUserSubmittedUrl } from "@/lib/url-safety"
import {
  badRequest,
  forbidden,
  handleRouteError,
  notFound,
  readJsonBody,
  unauthorized,
} from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"

type IncomingItem = {
  id?: string
  title?: string
  url?: string
  type?: string
}

type RouteContext = {
  params: Promise<{ id: string }>
}

async function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { id } = await params
    const currentUser = await getUser(session.user.id)

    const collection = await prisma.learningCollection.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    })

    if (!collection) return notFound("题单不存在")

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
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { id } = await params
    const currentUser = await getUser(session.user.id)
    const collection = await prisma.learningCollection.findUnique({ where: { id } })

    if (!collection) return notFound("题单不存在")
    if (!canManageCollection(currentUser, collection)) return forbidden("无权修改该题单")

    const body = await readJsonBody(request)

    const admin = isAdmin(currentUser)
    const items = (Array.isArray(body.items) ? body.items : []) as IncomingItem[]
    const cleanItems = items
      .map((item) => {
        const url = item.url ? String(item.url).trim() : null
        return {
          id: item.id,
          title: String(item.title ?? "").trim(),
          url: admin ? url : validateUserSubmittedUrl(url),
          type: normalizeCollectionType(item.type),
        }
      })
      .filter((item) => item.title)

    if (!admin && cleanItems.length > USER_COLLECTION_ITEM_LIMIT) {
      return NextResponse.json(
        { error: `普通用户每个题单最多只能包含 ${USER_COLLECTION_ITEM_LIMIT} 题` },
        { status: 403 }
      )
    }

    const title = String(body.title ?? collection.title).trim()
    const topic = String(body.topic ?? collection.topic).trim()
    const type = normalizeCollectionType(typeof body.type === "string" ? body.type : collection.type)
    if (!title) return badRequest("题单标题不能为空")
    if (!topic) return badRequest("题单方向不能为空")

    const keepIds = cleanItems
      .map((item) => item.id)
      .filter((itemId: unknown): itemId is string => typeof itemId === "string")

    await prisma.learningCollection.update({
      where: { id },
      data: {
        title,
        description: body.description ? String(body.description).trim() : null,
        topic,
        type,
        difficulty: normalizeLevel(typeof body.difficulty === "string" ? body.difficulty : collection.difficulty),
        isPublic: typeof body.isPublic === "boolean" ? body.isPublic : collection.isPublic,
      },
    })

    await prisma.collectionItem.deleteMany({
      where: {
        collectionId: id,
        ...(keepIds.length ? { id: { notIn: keepIds } } : {}),
      },
    })

    for (const [index, item] of cleanItems.entries()) {
      if (typeof item.id === "string") {
        const result = await prisma.collectionItem.updateMany({
          where: { id: item.id, collectionId: id },
          data: {
            title: item.title,
            url: item.url,
            type: item.type,
            sortOrder: index,
          },
        })
        if (result.count === 0) throw new Error("题单条目不存在或不属于该题单")
      } else {
        await prisma.collectionItem.create({
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

    const itemCount = await prisma.collectionItem.count({ where: { collectionId: id } })
    const updated = await prisma.learningCollection.update({
      where: { id },
      data: { itemCount },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    })

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
    const currentUser = await getUser(session.user.id)
    const collection = await prisma.learningCollection.findUnique({ where: { id } })

    if (!collection) return notFound("题单不存在")
    if (!canManageCollection(currentUser, collection)) return forbidden("无权删除该题单")

    await prisma.learningCollection.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
