"use client"

import { use, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { addDays, format, parseISO } from "date-fns"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react"
import { getLevelBadgeClass, normalizeLevel } from "@/lib/learning-domains"

interface Task {
  id: string
  title: string
  status: string
}

interface DailyPlan {
  id?: string
  date: string
  tasks: Task[]
}

interface Recommendation {
  itemId: string
  collectionId: string
  collectionTitle: string
  topic: string
  domainLabel: string
  targetLevel: string
  targetLevelLabel: string
  difficulty: string
  difficultyLabel: string
  title: string
  url?: string | null
  type: string
  estimatedHours?: number | null
  reason: string
}

interface RecommendationResponse {
  preferredTopics: string[]
  domainLevels: Record<string, string>
  recommendations: Recommendation[]
}

export default function DailyPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = use(params)
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const day = parseISO(date)

  const plan = useQuery<DailyPlan>({
    queryKey: ["plan", date],
    queryFn: async () => {
      const res = await fetch(`/api/plans?date=${date}`)
      return res.json()
    },
  })

  const recommendations = useQuery<RecommendationResponse>({
    queryKey: ["daily-recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/daily-recommendations")
      return res.json()
    },
  })

  const ensurePlan = async () => {
    if (plan.data?.id) return plan.data
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    })
    return res.json()
  }

  const addTask = useMutation({
    mutationFn: async (taskTitle?: string) => {
      const currentPlan = await ensurePlan()
      const res = await fetch(`/api/plans/${currentPlan.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: taskTitle ?? title }),
      })
      return res.json()
    },
    onSuccess: () => {
      setTitle("")
      queryClient.invalidateQueries({ queryKey: ["plan", date] })
    },
  })

  const toggleTask = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}/toggle`, { method: "PATCH" })
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan", date] }),
  })

  const tasks = plan.data?.tasks ?? []
  const completed = tasks.filter((task) => task.status === "completed").length

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">每日计划</h1>
            <p className="mt-1 text-sm text-slate-500">{format(day, "yyyy 年 M 月 d 日")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/daily/${format(addDays(day, -1), "yyyy-MM-dd")}`}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={`/daily/${format(new Date(), "yyyy-MM-dd")}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              今天
            </Link>
            <Link
              href={`/daily/${format(addDays(day, 1), "yyyy-MM-dd")}`}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (title.trim()) addTask.mutate(title)
            }}
            className="flex gap-2 border-b border-slate-200 p-4"
          >
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="添加一个清晰、可完成的任务"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              disabled={!title.trim() || addTask.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {addTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              添加
            </button>
          </form>

          <div className="p-3">
            {plan.isLoading ? (
              <div className="flex justify-center py-16 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : tasks.length ? (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const done = task.status === "completed"
                  return (
                    <button
                      key={task.id}
                      onClick={() => toggleTask.mutate(task.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300" />
                      )}
                      <span className={`text-sm ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                        {task.title}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-slate-500">
                今天还没有计划。可以从右侧推荐里挑一个开始。
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">完成进度</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">
              {completed}/{tasks.length}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              保持计划短而清楚，比堆满任务更可靠。
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-700" />
              <h2 className="font-semibold text-slate-950">智能推荐</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              根据画像里的领域水平，从匹配难度的题单里挑选未完成题目。
            </p>

            <div className="mt-4 space-y-3">
              {recommendations.isLoading ? (
                <div className="flex justify-center py-8 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : recommendations.data?.recommendations.length ? (
                recommendations.data.recommendations.map((item) => (
                  <div key={item.itemId} className="rounded-lg border border-slate-200 p-3">
                    <div className="text-sm font-medium text-slate-950">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.collectionTitle}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                        {item.domainLabel}
                      </span>
                      <span className={`rounded-full px-2 py-1 font-medium ring-1 ${getLevelBadgeClass(normalizeLevel(item.targetLevel))}`}>
                        画像：{item.targetLevelLabel}
                      </span>
                      <span className={`rounded-full px-2 py-1 font-medium ring-1 ${getLevelBadgeClass(normalizeLevel(item.difficulty))}`}>
                        题单：{item.difficultyLabel}
                      </span>
                    </div>
                    <div className="mt-2 text-xs leading-5 text-slate-500">{item.reason}</div>
                    <button
                      onClick={() => addTask.mutate(`学习：${item.title}`)}
                      disabled={addTask.isPending}
                      className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      加入今日计划
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-lg bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                  暂无推荐。可以先订阅或导入更多题单。
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
