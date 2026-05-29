export const DOMAIN_LEVELS = ["beginner", "intermediate", "advanced", "expert", "master"] as const

export type DomainLevel = (typeof DOMAIN_LEVELS)[number]

export const LEVEL_LABELS: Record<DomainLevel, string> = {
  beginner: "入门",
  intermediate: "中级",
  advanced: "高级",
  expert: "专家",
  master: "大师",
}

export const LEVEL_BADGE_CLASSES: Record<DomainLevel, string> = {
  beginner: "bg-slate-100 text-slate-700 ring-slate-200",
  intermediate: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  advanced: "bg-red-50 text-red-700 ring-red-200",
  expert: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  master: "bg-slate-950 text-white ring-slate-950",
}

export const LEVEL_BAR_CLASSES: Record<DomainLevel, string> = {
  beginner: "bg-slate-500",
  intermediate: "bg-yellow-500",
  advanced: "bg-red-500",
  expert: "bg-cyan-500",
  master: "bg-slate-950",
}

export const LEARNING_DOMAINS = [
  {
    key: "machine-learning",
    label: "机器学习",
    aliases: ["机器学习", "machine-learning", "ml", "kaggle", "深度学习", "deep-learning"],
  },
  {
    key: "computer-vision",
    label: "计算机视觉",
    aliases: ["计算机视觉", "computer-vision", "cv", "图像", "视觉"],
  },
  {
    key: "nlp",
    label: "自然语言处理",
    aliases: ["自然语言处理", "nlp", "文本", "语言模型", "bert"],
  },
  {
    key: "algorithm",
    label: "算法与数据结构",
    aliases: ["算法", "数据结构", "algorithm", "algorithms", "算法与数据结构", "luogu", "洛谷"],
  },
  {
    key: "llm-training",
    label: "大模型训练",
    aliases: ["大模型训练", "llm-training", "llm", "大模型", "微调", "finetuning", "fine-tuning"],
  },
] as const

export type LearningDomainKey = (typeof LEARNING_DOMAINS)[number]["key"]

export type DomainLevelMap = Record<LearningDomainKey, DomainLevel>

export const DEFAULT_DOMAIN_LEVELS: DomainLevelMap = {
  "machine-learning": "beginner",
  "computer-vision": "beginner",
  nlp: "beginner",
  algorithm: "beginner",
  "llm-training": "beginner",
}

const levelAliases: Record<string, DomainLevel> = {
  beginner: "beginner",
  easy: "beginner",
  "getting-started": "beginner",
  "getting_started": "beginner",
  入门: "beginner",
  初级: "beginner",
  intermediate: "intermediate",
  medium: "intermediate",
  进阶: "intermediate",
  中级: "intermediate",
  advanced: "advanced",
  hard: "advanced",
  高级: "advanced",
  困难: "advanced",
  expert: "expert",
  专家: "expert",
  专精: "expert",
  master: "master",
  大师: "master",
  宗师: "master",
}

export function normalizeDomain(value?: string | null): LearningDomainKey | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()

  for (const domain of LEARNING_DOMAINS) {
    if (domain.key === normalized) return domain.key
    if (domain.aliases.some((alias) => alias.toLowerCase() === normalized)) return domain.key
    if (domain.aliases.some((alias) => normalized.includes(alias.toLowerCase()))) return domain.key
  }

  return null
}

export function normalizeLevel(value?: string | null): DomainLevel {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return "beginner"
  return levelAliases[normalized] ?? "beginner"
}

export function parseDomainLevels(value?: string | null): DomainLevelMap {
  if (!value) return DEFAULT_DOMAIN_LEVELS

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    return LEARNING_DOMAINS.reduce<DomainLevelMap>(
      (acc, domain) => {
        const byKey = parsed[domain.key]
        const byLabel = parsed[domain.label]
        acc[domain.key] = normalizeLevel(
          typeof byKey === "string" ? byKey : typeof byLabel === "string" ? byLabel : acc[domain.key]
        )
        return acc
      },
      { ...DEFAULT_DOMAIN_LEVELS }
    )
  } catch {
    return DEFAULT_DOMAIN_LEVELS
  }
}

export function formatDomainLevels(levels: Partial<Record<string, string>>): DomainLevelMap {
  return LEARNING_DOMAINS.reduce<DomainLevelMap>(
    (acc, domain) => {
      acc[domain.key] = normalizeLevel(levels[domain.key] ?? levels[domain.label])
      return acc
    },
    { ...DEFAULT_DOMAIN_LEVELS }
  )
}

export function getDomainLabel(key: string) {
  return LEARNING_DOMAINS.find((domain) => domain.key === key)?.label ?? key
}

export function getLevelLabel(level: DomainLevel) {
  return LEVEL_LABELS[level]
}

export function getLevelBadgeClass(level: DomainLevel) {
  return LEVEL_BADGE_CLASSES[level]
}

export function getLevelBarClass(level: DomainLevel) {
  return LEVEL_BAR_CLASSES[level]
}

export function getAdjacentLevels(level: DomainLevel): DomainLevel[] {
  const currentIndex = DOMAIN_LEVELS.indexOf(level)
  return [...DOMAIN_LEVELS].sort((left, right) => {
    const leftDistance = Math.abs(DOMAIN_LEVELS.indexOf(left) - currentIndex)
    const rightDistance = Math.abs(DOMAIN_LEVELS.indexOf(right) - currentIndex)
    return leftDistance - rightDistance
  })
}
