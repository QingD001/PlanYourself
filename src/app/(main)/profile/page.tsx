"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { Brain, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import {
  DOMAIN_LEVELS,
  LEARNING_DOMAINS,
  LEVEL_LABELS,
  getLevelBadgeClass,
  getLevelBarClass,
  normalizeLevel,
} from "@/lib/learning-domains"
import { fetchJson } from "@/lib/fetch-json"

const domainLabels = Object.fromEntries(LEARNING_DOMAINS.map((domain) => [domain.key, domain.label]))
const chartColors = ["#2563eb", "#14b8a6", "#f97316", "#8b5cf6", "#e11d48"]

function getLevelWidth(level: string) {
  const index = DOMAIN_LEVELS.indexOf(level as never)
  return `${(((index >= 0 ? index : 0) + 1) / DOMAIN_LEVELS.length) * 100}%`
}

interface PreferenceItem {
  key: string
  label: string
  percentage: number
}

interface Profile {
  strengths: string[]
  weaknesses: string[]
  learningStyle?: string | null
  preferredTopics?: string[]
  preferenceDistribution?: PreferenceItem[]
  domainLevels?: Record<string, string>
  studyConsistency?: number | null
  averageDailyStudyMin?: number | null
  lastAnalyzedAt?: string | null
}

export default function ProfilePage() {
  const profile = useQuery<Profile>({
    queryKey: ["ai-profile"],
    queryFn: async () => {
      return fetchJson<Profile>("/api/ai/profile")
    },
  })

  const analyze = useMutation({
    mutationFn: async () => {
      return fetchJson<Profile>("/api/ai/profile", { method: "POST" })
    },
    onSuccess: () => profile.refetch(),
  })

  const data = profile.data
  const domainLevels = data?.domainLevels ?? {}
  const preferenceDistribution =
    data?.preferenceDistribution?.length
      ? data.preferenceDistribution
      : LEARNING_DOMAINS.map((domain) => ({ key: domain.key, label: domain.label, percentage: 0 }))
  const hasPreference = preferenceDistribution.some((item) => item.percentage > 0)

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
            <Brain className="h-4 w-4" />
            AI 学习画像
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">了解自己的学习状态</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            根据计划、打卡、复盘和最近做题趋势，评估五个方向的当前等级和偏好占比。
          </p>
        </div>
        <button
          onClick={() => analyze.mutate()}
          disabled={analyze.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          重新分析
        </button>
      </section>

      {analyze.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {analyze.error.message}
        </div>
      ) : null}

      {profile.isLoading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">学习一致性</div>
            <div className="mt-4 text-3xl font-semibold text-slate-950">
              {Math.round((data?.studyConsistency ?? 0) * 100)}%
            </div>
            <p className="mt-2 text-sm text-slate-500">
              日均学习 {Math.round(data?.averageDailyStudyMin ?? 0)} 分钟
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-700" />
              <h2 className="font-semibold text-slate-950">偏好方向</h2>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[260px_1fr] md:items-center">
              <div className="h-64">
                {hasPreference ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={preferenceDistribution}
                        dataKey="percentage"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {preferenceDistribution.map((item, index) => (
                          <Cell key={item.key} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">
                    暂无最近做题数据
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {preferenceDistribution.map((item, index) => (
                  <div key={item.key} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: chartColors[index % chartColors.length] }}
                      />
                      <span className="truncate text-sm text-slate-700">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-950">{item.percentage}%</span>
                  </div>
                ))}
                <p className="pt-2 text-xs leading-5 text-slate-500">
                  占比按最近 30 天已完成题目计算，越新的完成记录权重越高。
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
            <h2 className="font-semibold text-slate-950">领域水平</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {Object.entries(domainLabels).map(([key, label]) => {
                const level = normalizeLevel(domainLevels[key])
                return (
                  <div key={key} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-slate-800">{label}</div>
                      <div className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${getLevelBadgeClass(level)}`}>
                        {LEVEL_LABELS[level as keyof typeof LEVEL_LABELS] ?? "入门"}
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${getLevelBarClass(level)}`} style={{ width: getLevelWidth(level) }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">优势</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {(data?.strengths?.length ? data.strengths : ["需要更多数据"]).map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">待改进</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {(data?.weaknesses?.length ? data.weaknesses : ["需要更多数据"]).map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">学习风格</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {data?.learningStyle ?? "暂无足够数据。先坚持记录一周。"}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
