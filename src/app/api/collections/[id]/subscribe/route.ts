import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { id } = await params

  await prisma.collectionSubscription.upsert({
    where: { userId_collectionId: { userId: session.user.id, collectionId: id } },
    create: { userId: session.user.id, collectionId: id },
    update: {},
  })

  return NextResponse.json({ subscribed: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { id } = await params

  await prisma.collectionSubscription.deleteMany({
    where: { userId: session.user.id, collectionId: id },
  })

  return NextResponse.json({ subscribed: false })
}
