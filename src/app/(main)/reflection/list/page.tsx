"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

interface Reflection {
  id: string
  date: string
  content: string
  learningSummary?: string
  productivity?: number
  focus?: number
}

interface ReflectionResponse {
  reflections: Reflection[]
  total: number
}

export default function ReflectionListPage() {
  const { data, isLoading } = useQuery<ReflectionResponse>({
    queryKey: ["reflections"],
    queryFn: async () => {
      const res = await fetch("/api/reflections?limit=50")
      return res.json()
    },
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">反思历史</h1>
          <p className="mt-1 text-sm text-slate-500">共 {data?.total ?? 0} 条记录</p>
        </div>
        <Link href="/reflection" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          写今天
        </Link>
      </section>

      <section className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : data?.reflections?.length ? (
          data.reflections.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div className="text-sm font-semibold text-slate-950">
                  {format(new Date(item.date), "yyyy 年 M 月 d 日")}
                </div>
                <div className="text-xs text-slate-500">
                  效率 {item.productivity ?? "-"} / 专注 {item.focus ?? "-"}
                </div>
              </div>
              {item.learningSummary && (
                <p className="mt-3 text-sm font-medium text-blue-700">{item.learningSummary}</p>
              )}
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.content}</p>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
            还没有反思记录。
          </div>
        )}
      </section>
    </div>
  )
}
