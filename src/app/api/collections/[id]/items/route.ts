import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  USER_COLLECTION_ITEM_LIMIT,
  canManageCollection,
  isAdmin,
} from "@/lib/permissions"
import { normalizeCollectionType } from "@/lib/collection-types"
import { forbidden, handleRouteError, notFound, readJsonBody, unauthorized } from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { id } = await params
    const body = await readJsonBody(request)
    const title = String(body.title ?? "").trim()
    if (!title) return NextResponse.json({ error: "题目标题不能为空" }, { status: 400 })

    const [collection, currentUser] = await Promise.all([
      prisma.learningCollection.findUnique({ where: { id } }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true },
      }),
    ])

    if (!collection) return notFound("题单不存在")
    if (!canManageCollection(currentUser, collection)) return forbidden("无权修改该题单")

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
        url: body.url ? String(body.url).trim() : null,
        type: normalizeCollectionType(typeof body.type === "string" ? body.type : undefined),
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
    })

    await prisma.learningCollection.update({
      where: { id },
      data: { itemCount: { increment: 1 } },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}
