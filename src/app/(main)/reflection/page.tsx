"use client"

import Link from "next/link"
import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { BookOpen, Loader2 } from "lucide-react"

interface Reflection {
  content?: string
  productivity?: number
  focus?: number
  learningSummary?: string
}

function Rating({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-slate-800">{label}</div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`h-9 w-9 rounded-lg text-sm font-semibold ${
              score <= value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ReflectionPage() {
  const today = format(new Date(), "yyyy-MM-dd")
  const [content, setContent] = useState("")
  const [learningSummary, setLearningSummary] = useState("")
  const [productivity, setProductivity] = useState(3)
  const [focus, setFocus] = useState(3)

  const reflection = useQuery<Reflection>({
    queryKey: ["reflection", today],
    queryFn: async () => {
      const res = await fetch(`/api/reflections?date=${today}`)
      const data = await res.json()
      if (data.content && !content) setContent(data.content)
      if (data.learningSummary && !learningSummary) setLearningSummary(data.learningSummary)
      if (data.productivity) setProductivity(data.productivity)
      if (data.focus) setFocus(data.focus)
      return data
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          content,
          learningSummary,
          productivity,
          focus,
        }),
      })
      return res.json()
    },
    onSuccess: () => reflection.refetch(),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">每日反思</h1>
          <p className="mt-2 text-sm text-slate-500">把经验写下来，明天就少绕一点路。</p>
        </div>
        <Link
          href="/reflection/list"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          历史记录
        </Link>
      </section>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
            <BookOpen className="h-4 w-4 text-blue-700" />
            今天发生了什么？
          </label>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            placeholder="学习收获、卡住的地方、值得保留的方法..."
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800">一句话总结</label>
          <input
            value={learningSummary}
            onChange={(event) => setLearningSummary(event.target.value)}
            placeholder="今天最重要的一个结论"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Rating label="效率自评" value={productivity} onChange={setProductivity} />
          <Rating label="专注度" value={focus} onChange={setFocus} />
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={!content.trim() || save.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {save.isSuccess ? "已保存" : "保存反思"}
        </button>
      </section>
    </div>
  )
}
