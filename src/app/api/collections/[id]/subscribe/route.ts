import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { handleRouteError, unauthorized } from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { id } = await params
    await prisma.collectionSubscription.upsert({
      where: { userId_collectionId: { userId: session.user.id, collectionId: id } },
      create: { userId: session.user.id, collectionId: id },
      update: {},
    })

    return NextResponse.json({ subscribed: true })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { id } = await params
    await prisma.collectionSubscription.deleteMany({
      where: { userId: session.user.id, collectionId: id },
    })

    return NextResponse.json({ subscribed: false })
  } catch (error) {
    return handleRouteError(error)
  }
}
