"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { DOMAIN_LEVELS, LEARNING_DOMAINS, LEVEL_LABELS } from "@/lib/learning-domains"

interface DraftItem {
  id: string
  title: string
  url: string
  type: string
}

interface CollectionLimits {
  isAdmin: boolean
  collectionCount: number
  maxCollections: number | null
  maxItemsPerCollection: number | null
  canCreateCollection: boolean
}

const topics = [...LEARNING_DOMAINS, { key: "other", label: "其他" }]

export default function CreateCollectionPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [topic, setTopic] = useState("machine-learning")
  const [difficulty, setDifficulty] = useState("beginner")
  const [items, setItems] = useState<DraftItem[]>([
    { id: "1", title: "", url: "", type: "article" },
  ])

  const limits = useQuery<CollectionLimits>({
    queryKey: ["collection-limits"],
    queryFn: async () => {
      const res = await fetch("/api/collections/limits")
      return res.json()
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          topic,
          difficulty,
          items: items.filter((item) => item.title.trim()),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "创建失败")
      return data
    },
    onSuccess: (data) => router.push(`/collections/${data.id}`),
  })

  const maxItems = limits.data?.maxItemsPerCollection
  const canAddItem = maxItems === null || maxItems === undefined || items.length < maxItems
  const canCreate = limits.data?.canCreateCollection ?? true

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">创建学习题单</h1>
        <p className="mt-2 text-sm text-slate-500">
          普通用户最多创建 3 个题单，每个题单最多 5 题；管理员不受限制。
        </p>
        {limits.data && !limits.data.isAdmin ? (
          <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            已创建 {limits.data.collectionCount}/{limits.data.maxCollections} 个题单，当前条目 {items.length}/
            {limits.data.maxItemsPerCollection}
          </div>
        ) : null}
      </section>

      {!canCreate ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          你已经达到普通用户题单数量上限，无法继续创建新题单。
        </div>
      ) : null}

      {create.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {create.error.message}
        </div>
      ) : null}

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800">题单名称</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="例如：机器学习入门路线"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800">简介</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="适合谁、学完能获得什么"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">主题</label>
            <select
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {topics.map((value) => (
                <option key={value.key} value={value.key}>
                  {value.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">难度</label>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {DOMAIN_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-950">学习项目</h2>
          <button
            onClick={() =>
              setItems((value) => [
                ...value,
                { id: crypto.randomUUID(), title: "", url: "", type: "article" },
              ])
            }
            disabled={!canAddItem}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            添加
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-lg border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_140px_40px]">
              <input
                value={item.title}
                onChange={(event) =>
                  setItems((value) => value.map((row) => row.id === item.id ? { ...row, title: event.target.value } : row))
                }
                placeholder="资源名称"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={item.url}
                onChange={(event) =>
                  setItems((value) => value.map((row) => row.id === item.id ? { ...row, url: event.target.value } : row))
                }
                placeholder="链接（可选）"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                value={item.type}
                onChange={(event) =>
                  setItems((value) => value.map((row) => row.id === item.id ? { ...row, type: event.target.value } : row))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="article">文章</option>
                <option value="video">视频</option>
                <option value="course">课程</option>
                <option value="book">书籍</option>
                <option value="project">项目</option>
                <option value="exercise">题目</option>
              </select>
              <button
                onClick={() => setItems((value) => value.filter((row) => row.id !== item.id))}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={() => create.mutate()}
        disabled={!title.trim() || create.isPending || !canCreate}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        创建题单
      </button>
    </div>
  )
}
