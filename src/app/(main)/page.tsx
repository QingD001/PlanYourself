"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Flame,
  Loader2,
  Sparkles,
} from "lucide-react"
import { fetchJson } from "@/lib/fetch-json"

interface Task {
  id: string
  title: string
  status: string
}

interface DailyPlan {
  id?: string
  tasks: Task[]
}

interface StreakStats {
  currentStreak?: number
  longestStreak?: number
  totalCheckIns?: number
}

interface ReflectionList {
  total?: number
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: string
  helper: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium text-slate-400">{label}</span>
      </div>
      <div className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-sm text-slate-500">{helper}</div>
    </div>
  )
}

export default function DashboardPage() {
  const today = format(new Date(), "yyyy-MM-dd")

  const plan = useQuery<DailyPlan>({
    queryKey: ["plan", today],
    queryFn: async () => {
      return fetchJson<DailyPlan>(`/api/plans?date=${today}`)
    },
  })

  const stats = useQuery<StreakStats>({
    queryKey: ["checkin-stats"],
    queryFn: async () => {
      return fetchJson<StreakStats>("/api/checkins/stats")
    },
  })

  const reflections = useQuery<ReflectionList>({
    queryKey: ["reflection-summary"],
    queryFn: async () => {
      return fetchJson<ReflectionList>("/api/reflections?limit=1")
    },
  })

  const tasks = plan.data?.tasks ?? []
  const completed = tasks.filter((task) => task.status === "completed").length
  const completionRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-blue-700">{format(new Date(), "yyyy.MM.dd")}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            仪表盘
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            用一个清楚的工作台管理计划、打卡、反思和学习题单。
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/checkin"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            今日打卡
          </Link>
          <Link
            href="/daily"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            安排计划
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="今日完成"
          value={plan.isLoading ? "..." : `${completed}/${tasks.length}`}
          helper={`完成率 ${completionRate}%`}
          icon={CheckCircle2}
        />
        <StatCard
          label="连续打卡"
          value={`${stats.data?.currentStreak ?? 0} 天`}
          helper={`最长 ${stats.data?.longestStreak ?? 0} 天`}
          icon={Flame}
        />
        <StatCard
          label="累计打卡"
          value={`${stats.data?.totalCheckIns ?? 0}`}
          helper="形成稳定反馈"
          icon={CalendarDays}
        />
        <StatCard
          label="反思记录"
          value={`${reflections.data?.total ?? 0}`}
          helper="复盘让进步可见"
          icon={BookOpen}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-950">今日计划</h2>
              <p className="text-sm text-slate-500">聚焦今天最重要的几件事</p>
            </div>
            <Link href="/daily" className="flex items-center gap-1 text-sm font-medium text-blue-700">
              查看 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 p-2">
            {plan.isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : tasks.length ? (
              tasks.slice(0, 6).map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-lg px-3 py-3">
                  <CheckCircle2
                    className={`h-5 w-5 ${
                      task.status === "completed" ? "text-blue-600" : "text-slate-300"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      task.status === "completed"
                        ? "text-slate-400 line-through"
                        : "text-slate-800"
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-3 py-12 text-center">
                <p className="text-sm text-slate-500">今天还没有任务。</p>
                <Link
                  href="/daily"
                  className="mt-3 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  添加任务
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-700" />
            <h2 className="font-semibold text-slate-950">今日建议</h2>
          </div>
          <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
            <p>先完成一个能立刻推进的任务，再处理需要深度思考的部分。</p>
            <p>如果任务超过 90 分钟，把它拆成两个明确的完成点。</p>
            <p>晚上留 5 分钟写反思，记录一个有效方法和一个待改进点。</p>
          </div>
        </div>
      </section>
    </div>
  )
}
