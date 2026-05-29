import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  DEFAULT_DOMAIN_LEVELS,
  LEARNING_DOMAINS,
  getAdjacentLevels,
  getDomainLabel,
  getLevelLabel,
  normalizeDomain,
  normalizeLevel,
  parseDomainLevels,
  type LearningDomainKey,
} from "@/lib/learning-domains"
import { prisma } from "@/lib/prisma"

function safeJsonArray(value?: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

function getTopicOrder(profileTopics: string[]) {
  const normalized = profileTopics
    .map((topic) => normalizeDomain(topic))
    .filter((topic): topic is LearningDomainKey => Boolean(topic))
  return normalized.length ? normalized : LEARNING_DOMAINS.map((domain) => domain.key)
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const userId = session.user.id
  const profile = await prisma.userProfile.findUnique({ where: { userId } })
  const preferredTopics = getTopicOrder(safeJsonArray(profile?.preferredTopics))
  const domainLevels = profile?.domainLevels ? parseDomainLevels(profile.domainLevels) : DEFAULT_DOMAIN_LEVELS

  const collections = await prisma.learningCollection.findMany({
    where: { isPublic: true },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          progress: {
            where: { userId },
            select: { completed: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
  })

  const scoredCollections = collections
    .map((collection) => {
      const domain = normalizeDomain(collection.topic)
      const topicIndex = domain ? preferredTopics.indexOf(domain) : -1
      const targetLevel = domain ? domainLevels[domain] : "beginner"
      const difficulty = normalizeLevel(collection.difficulty)
      const levelRank = getAdjacentLevels(targetLevel).indexOf(difficulty)

      return {
        collection,
        domain,
        targetLevel,
        difficulty,
        score:
          (topicIndex >= 0 ? 100 - topicIndex * 10 : 20) +
          (levelRank >= 0 ? 30 - levelRank * 8 : 0),
      }
    })
    .sort((a, b) => b.score - a.score)

  const recommendations = scoredCollections
    .flatMap(({ collection, domain, targetLevel, difficulty }) =>
      collection.items
        .filter((item) => !item.progress.some((entry) => entry.completed))
        .slice(0, 2)
        .map((item) => ({
          itemId: item.id,
          collectionId: collection.id,
          collectionTitle: collection.title,
          topic: collection.topic,
          domain: domain ?? collection.topic,
          domainLabel: domain ? getDomainLabel(domain) : collection.topic,
          targetLevel,
          targetLevelLabel: getLevelLabel(targetLevel),
          difficulty,
          difficultyLabel: getLevelLabel(difficulty),
          title: item.title,
          url: item.url,
          type: item.type,
          estimatedHours: item.estimatedHours,
          reason: domain
            ? `${getDomainLabel(domain)}当前评估为${getLevelLabel(targetLevel)}，优先推荐同等级题单`
            : `来自最近可学习题单：${collection.title}`,
        }))
    )
    .slice(0, 6)

  return NextResponse.json({
    preferredTopics,
    domainLevels,
    recommendations,
  })
}
