import type { LearningCollection } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const USER_COLLECTION_LIMIT = 3
export const USER_COLLECTION_ITEM_LIMIT = 5

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  })
}

export function canManageCollection(
  user: { id: string; role: string } | null,
  collection: Pick<LearningCollection, "creatorId">
) {
  if (!user) return false
  return user.role === "admin" || collection.creatorId === user.id
}

export function isAdmin(user: { role: string } | null) {
  return user?.role === "admin"
}
