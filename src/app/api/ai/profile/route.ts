import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateStructuredResponse } from "@/lib/ai"
import {
  DEFAULT_DOMAIN_LEVELS,
  LEARNING_DOMAINS,
  formatDomainLevels,
  normalizeDomain,
  parseDomainLevels,
  type DomainLevel,
  type LearningDomainKey,
} from "@/lib/learning-domains"
import { prisma } from "@/lib/prisma"

type CompletedProgress = {
  completedAt: Date | null
  item: {
    title: string
    collection: {
      title: string
      topic: string
      difficulty: string
    }
  }
}

function safeJsonArray(value?: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

function inferDomainLevels(progress: CompletedProgress[]) {
  const scoreByDomain = new Map<LearningDomainKey, number>()
  const difficultyScore: Record<string, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4,
    master: 5,
  }

  for (const entry of progress) {
    const domain = normalizeDomain(entry.item.collection.topic)
    if (!domain) continue
    scoreByDomain.set(
      domain,
      (scoreByDomain.get(domain) ?? 0) + (difficultyScore[entry.item.collection.difficulty] ?? 1)
    )
  }

  return LEARNING_DOMAINS.reduce<Record<LearningDomainKey, DomainLevel>>(
    (acc, domain) => {
      const score = scoreByDomain.get(domain.key) ?? 0
      if (score >= 32) acc[domain.key] = "master"
      else if (score >= 22) acc[domain.key] = "expert"
      else if (score >= 12) acc[domain.key] = "advanced"
      else if (score >= 5) acc[domain.key] = "intermediate"
      else acc[domain.key] = "beginner"
      return acc
    },
    { ...DEFAULT_DOMAIN_LEVELS }
  )
}

function buildPreferenceDistribution(progress: CompletedProgress[]) {
  const now = Date.now()
  const scoreByDomain = new Map<LearningDomainKey, number>()

  for (const entry of progress) {
    const domain = normalizeDomain(entry.item.collection.topic)
    if (!domain) continue

    const completedAt = entry.completedAt?.getTime() ?? now
    const ageDays = Math.max(0, (now - completedAt) / 86_400_000)
    const recencyWeight = Math.max(0.25, 1 - ageDays / 30)
    scoreByDomain.set(domain, (scoreByDomain.get(domain) ?? 0) + recencyWeight)
  }

  const total = Array.from(scoreByDomain.values()).reduce((sum, value) => sum + value, 0)

  if (total <= 0) {
    return LEARNING_DOMAINS.map((domain) => ({
      key: domain.key,
      label: domain.label,
      percentage: 0,
    }))
  }

  const raw = LEARNING_DOMAINS.map((domain) => ({
    key: domain.key,
    label: domain.label,
    percentage: Math.round(((scoreByDomain.get(domain.key) ?? 0) / total) * 100),
  }))
  const delta = 100 - raw.reduce((sum, item) => sum + item.percentage, 0)
  const maxIndex = raw.reduce(
    (bestIndex, item, index) => (item.percentage > raw[bestIndex].percentage ? index : bestIndex),
    0
  )
  raw[maxIndex].percentage += delta
  return raw
}

function topicsFromDistribution(distribution: Array<{ key: string; percentage: number }>) {
  return distribution
    .filter((item) => item.percentage > 0)
    .sort((left, right) => right.percentage - left.percentage)
    .map((item) => item.key)
}

async function getCompletedProgress(userId: string, since?: Date) {
  return prisma.collectionProgress.findMany({
    where: {
      userId,
      completed: true,
      ...(since ? { completedAt: { gte: since } } : {}),
    },
    orderBy: { completedAt: "desc" },
    include: {
      item: {
        include: {
          collection: {
            select: { title: true, topic: true, difficulty: true },
          },
        },
      },
    },
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const userId = session.user.id

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const [profile, recentProgress] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    getCompletedProgress(userId, thirtyDaysAgo),
  ])
  const preferenceDistribution = buildPreferenceDistribution(recentProgress)

  if (!profile) {
    return NextResponse.json({
      strengths: [],
      weaknesses: [],
      learningStyle: null,
      peakProductivityTimes: null,
      preferredTopics: topicsFromDistribution(preferenceDistribution),
      preferenceDistribution,
      domainLevels: DEFAULT_DOMAIN_LEVELS,
      studyConsistency: null,
      averageDailyStudyMin: null,
      lastAnalyzedAt: null,
    })
  }

  const trendTopics = topicsFromDistribution(preferenceDistribution)

  return NextResponse.json({
    ...profile,
    strengths: safeJsonArray(profile.strengths),
    weaknesses: safeJsonArray(profile.weaknesses),
    preferredTopics: trendTopics.length ? trendTopics : safeJsonArray(profile.preferredTopics),
    preferenceDistribution,
    domainLevels: parseDomainLevels(profile.domainLevels),
    peakProductivityTimes: profile.peakProductivityTimes
      ? JSON.parse(profile.peakProductivityTimes)
      : null,
  })
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const userId = session.user.id

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [checkIns, activityDays, reflections, progress] = await Promise.all([
    prisma.checkIn.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "desc" },
    }),
    prisma.activityDay.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "desc" },
    }),
    prisma.reflection.count({ where: { userId, date: { gte: thirtyDaysAgo } } }),
    getCompletedProgress(userId, thirtyDaysAgo),
  ])

  const avgMood =
    checkIns.length > 0
      ? Math.round((checkIns.reduce((sum, item) => sum + item.mood, 0) / checkIns.length) * 10) / 10
      : 0
  const avgEnergy =
    checkIns.length > 0
      ? Math.round((checkIns.reduce((sum, item) => sum + item.energy, 0) / checkIns.length) * 10) / 10
      : 0
  const totalTasksCompleted = activityDays.reduce((sum, day) => sum + day.tasksCompleted, 0)
  const totalTasksPlanned = activityDays.reduce((sum, day) => sum + day.tasksPlanned, 0)
  const consistency =
    activityDays.length > 0
      ? Math.round(
          (activityDays.filter((day) => day.tasksCompleted > 0 || day.hasCheckIn).length /
            activityDays.length) *
            100
        ) / 100
      : 0
  const inferredDomainLevels = inferDomainLevels(progress)
  const preferenceDistribution = buildPreferenceDistribution(progress)
  const trendTopics = topicsFromDistribution(preferenceDistribution)

  const completedItems = progress.slice(0, 30).map((entry) => ({
    title: entry.item.title,
    collectionTitle: entry.item.collection.title,
    topic: entry.item.collection.topic,
    difficulty: entry.item.collection.difficulty,
    completedAt: entry.completedAt,
  }))

  const userPrompt = JSON.stringify({
    allowedDomains: LEARNING_DOMAINS.map((domain) => ({
      key: domain.key,
      label: domain.label,
    })),
    allowedLevels: ["beginner", "intermediate", "advanced", "expert", "master"],
    recentPreferenceDistribution: preferenceDistribution,
    stats: {
      daysWithActivity: activityDays.filter((day) => day.tasksCompleted > 0 || day.hasCheckIn).length,
      totalDays: activityDays.length,
      totalTasksCompleted,
      totalTasksPlanned,
      completionRate:
        totalTasksPlanned > 0 ? Math.round((totalTasksCompleted / totalTasksPlanned) * 100) : 0,
      averageMood: avgMood,
      averageEnergy: avgEnergy,
      reflectionsWritten: reflections,
      consistencyScore: consistency,
      completedItems,
      inferredDomainLevels,
    },
  })

  const result = await generateStructuredResponse<{
    strengths: string[]
    weaknesses: string[]
    learningStyle: string
    peakProductivityTimes: { dayOfWeek: number; timeRange: string }[]
    preferredTopics: string[]
    domainLevels: Record<string, string>
    studyConsistency: number
    averageDailyStudyMin: number
  }>({
    systemPrompt:
      "你是一位教育心理学家和 AI 学习教练。分析用户近 30 天的计划、打卡、复盘和题单完成情况，生成 JSON 用户画像。必须只返回 JSON。domainLevels 必须覆盖五个固定领域 key：machine-learning、computer-vision、nlp、algorithm、llm-training；每个值只能是 beginner、intermediate、advanced、expert、master。preferredTopics 使用同样的领域 key，并优先参考 recentPreferenceDistribution 的最近做题趋势排序。返回格式：{strengths:[],weaknesses:[],learningStyle:\"\",peakProductivityTimes:[],preferredTopics:[],domainLevels:{},studyConsistency:0.0,averageDailyStudyMin:0}",
    userPrompt,
  })

  const domainLevels = result?.domainLevels
    ? formatDomainLevels({ ...inferredDomainLevels, ...result.domainLevels })
    : inferredDomainLevels
  const aiTopics =
    result?.preferredTopics
      ?.map((topic) => normalizeDomain(topic))
      .filter((topic): topic is LearningDomainKey => Boolean(topic)) ?? []
  const fallbackTopics = LEARNING_DOMAINS.map((domain) => domain.key)
  const preferredTopics = trendTopics.length ? trendTopics : aiTopics.length ? aiTopics : fallbackTopics

  const profileData = {
    strengths: JSON.stringify(result?.strengths ?? ["学习记录稳定", "愿意持续复盘", "有明确提升方向"]),
    weaknesses: JSON.stringify(result?.weaknesses ?? ["需要更多题单完成数据", "不同领域水平差异还需要继续观察"]),
    learningStyle: result?.learningStyle ?? "偏实践驱动：通过题目和项目反馈来校准学习节奏",
    peakProductivityTimes: JSON.stringify(
      result?.peakProductivityTimes ?? [{ dayOfWeek: 1, timeRange: "09:00-11:00" }]
    ),
    preferredTopics: JSON.stringify(preferredTopics),
    domainLevels: JSON.stringify(domainLevels),
    studyConsistency: result?.studyConsistency ?? consistency,
    averageDailyStudyMin: result?.averageDailyStudyMin ?? 60,
    rawProfileData: JSON.stringify({
      result,
      inferredDomainLevels,
      preferenceDistribution,
    }),
    lastAnalyzedAt: new Date(),
  }

  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  })

  return NextResponse.json({
    ...profileData,
    strengths: JSON.parse(profileData.strengths),
    weaknesses: JSON.parse(profileData.weaknesses),
    preferredTopics: JSON.parse(profileData.preferredTopics),
    preferenceDistribution,
    domainLevels: JSON.parse(profileData.domainLevels),
    peakProductivityTimes: JSON.parse(profileData.peakProductivityTimes),
  })
}
