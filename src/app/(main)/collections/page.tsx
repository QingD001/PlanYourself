"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BookOpen, Loader2, Plus } from "lucide-react"
import { getDomainLabel, getLevelBadgeClass, getLevelLabel, normalizeLevel } from "@/lib/learning-domains"

interface Collection {
  id: string
  title: string
  description?: string
  topic: string
  difficulty: string
  itemCount: number
  completedCount: number
  isSubscribed: boolean
}

const tabs = [
  { value: "", label: "全部" },
  { value: "subscribed", label: "已订阅" },
]

export default function CollectionsPage() {
  const [tab, setTab] = useState("")

  const { data, isLoading } = useQuery<Collection[]>({
    queryKey: ["collections", tab],
    queryFn: async () => {
      const query = tab ? `?tab=${tab}` : ""
      const res = await fetch(`/api/collections${query}`)
      return res.json()
    },
  })

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">学习题单</h1>
          <p className="mt-2 text-sm text-slate-500">把资源整理成路径，减少每次选择的成本。</p>
        </div>
        <Link
          href="/collections/create"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          创建题单
        </Link>
      </section>

      <div className="flex gap-2">
        {tabs.map((item) => (
          <button
            key={item.value}
            onClick={() => setTab(item.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === item.value ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((collection) => {
            const progress = collection.itemCount
              ? Math.round((collection.completedCount / collection.itemCount) * 100)
              : 0
            const level = normalizeLevel(collection.difficulty)
            return (
              <Link
                key={collection.id}
                href={`/collections/${collection.id}`}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${getLevelBadgeClass(level)}`}>
                    {getLevelLabel(level)}
                  </span>
                </div>
                <h2 className="mt-4 text-base font-semibold text-slate-950">{collection.title}</h2>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                  {collection.description ?? "暂无简介"}
                </p>
                <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                  <span>{getDomainLabel(collection.topic)}</span>
                  <span>{collection.completedCount}/{collection.itemCount}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                </div>
              </Link>
            )
          })}
        </section>
      )}
    </div>
  )
}
