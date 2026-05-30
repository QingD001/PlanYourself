"use client"

import Link from "next/link"
import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react"
import {
  DOMAIN_LEVELS,
  LEARNING_DOMAINS,
  LEVEL_LABELS,
  getDomainLabel,
  getLevelBadgeClass,
  getLevelLabel,
  normalizeLevel,
} from "@/lib/learning-domains"
import { COLLECTION_TYPES, DEFAULT_COLLECTION_TYPE, getCollectionTypeLabel } from "@/lib/collection-types"
import { fetchJson } from "@/lib/fetch-json"

interface CollectionItem {
  id: string
  title: string
  url?: string | null
  type: string
  completed: boolean
}

interface DraftItem {
  id?: string
  clientId: string
  title: string
  url: string
  type: string
}

interface Collection {
  id: string
  title: string
  description?: string | null
  topic: string
  type: string
  difficulty: string
  isPublic: boolean
  isSubscribed: boolean
  canManage: boolean
  isAdmin: boolean
  maxItemsPerCollection: number | null
  completedCount: number
  items: CollectionItem[]
}

export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    topic: "machine-learning",
    type: DEFAULT_COLLECTION_TYPE as string,
    difficulty: "beginner",
    items: [] as DraftItem[],
  })

  const collection = useQuery<Collection>({
    queryKey: ["collection", id],
    queryFn: async () => {
      return fetchJson<Collection>(`/api/collections/${id}`)
    },
  })

  function startEditing() {
    if (!collection.data) return
    setDraft({
      title: collection.data.title,
      description: collection.data.description ?? "",
      topic: collection.data.topic,
      type: collection.data.type ?? DEFAULT_COLLECTION_TYPE,
      difficulty: normalizeLevel(collection.data.difficulty),
      items: collection.data.items.map((item) => ({
        id: item.id,
        clientId: item.id,
        title: item.title,
        url: item.url ?? "",
        type: item.type,
      })),
    })
    setEditing(true)
  }

  const subscribe = useMutation({
    mutationFn: async () => {
      const method = collection.data?.isSubscribed ? "DELETE" : "POST"
      return fetchJson<{ ok: boolean }>(`/api/collections/${id}/subscribe`, { method })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collection", id] }),
  })

  const saveCollection = useMutation({
    mutationFn: async () => {
      return fetchJson<Collection>(`/api/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          items: draft.items.filter((item) => item.title.trim()),
        }),
      })
    },
    onSuccess: () => {
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ["collection", id] })
      queryClient.invalidateQueries({ queryKey: ["collections"] })
    },
  })

  const deleteCollection = useMutation({
    mutationFn: async () => {
      return fetchJson<{ ok: boolean }>(`/api/collections/${id}`, { method: "DELETE" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] })
      router.push("/collections")
    },
  })

  const toggleItem = useMutation({
    mutationFn: async (itemId: string) => {
      return fetchJson<{ ok: boolean }>(`/api/collections/${id}/items/${itemId}`, { method: "PATCH" })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collection", id] }),
  })

  if (collection.isLoading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (collection.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {collection.error.message}
      </div>
    )
  }

  if (!collection.data) {
    return <div className="text-sm text-slate-500">题单不存在。</div>
  }

  const itemCount = collection.data.items.length
  const completed = collection.data.items.filter((item) => item.completed).length
  const progress = itemCount ? Math.round((completed / itemCount) * 100) : 0
  const canAddDraftItem =
    collection.data.isAdmin ||
    collection.data.maxItemsPerCollection === null ||
    draft.items.length < collection.data.maxItemsPerCollection

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/collections" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        返回题单
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          {editing ? (
            <div className="w-full max-w-3xl space-y-4">
              <input
                value={draft.title}
                onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xl font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <textarea
                value={draft.description}
                onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))}
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="题单简介"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  value={draft.topic}
                  onChange={(event) => setDraft((value) => ({ ...value, topic: event.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {LEARNING_DOMAINS.map((domain) => (
                    <option key={domain.key} value={domain.key}>
                      {domain.label}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.type}
                  onChange={(event) => setDraft((value) => ({ ...value, type: event.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {COLLECTION_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.difficulty}
                  onChange={(event) => setDraft((value) => ({ ...value, difficulty: event.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {DOMAIN_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                  {getDomainLabel(collection.data.topic)}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
                  {getCollectionTypeLabel(collection.data.type)}
                </span>
                <span
                  className={`rounded-full px-2 py-1 font-medium ring-1 ${getLevelBadgeClass(
                    normalizeLevel(collection.data.difficulty)
                  )}`}
                >
                  {getLevelLabel(normalizeLevel(collection.data.difficulty))}
                </span>
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-slate-950">{collection.data.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {collection.data.description ?? "暂无简介"}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {collection.data.canManage && editing ? (
              <>
                <button
                  onClick={() => saveCollection.mutate()}
                  disabled={saveCollection.isPending || !draft.title.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saveCollection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  取消
                </button>
              </>
            ) : null}
            {collection.data.canManage && !editing ? (
              <>
                <button
                  onClick={startEditing}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  编辑
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("确认删除这个题单？相关进度也会被删除。")) {
                      deleteCollection.mutate()
                    }
                  }}
                  disabled={deleteCollection.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleteCollection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  删除
                </button>
              </>
            ) : null}
            {!editing ? (
              <button
                onClick={() => subscribe.mutate()}
                disabled={subscribe.isPending}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  collection.data.isSubscribed
                    ? "border border-slate-200 text-slate-700 hover:bg-slate-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {collection.data.isSubscribed ? "取消订阅" : "订阅题单"}
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm font-medium text-slate-600">{completed}/{itemCount}</span>
        </div>
      </section>

      {saveCollection.error || deleteCollection.error || subscribe.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveCollection.error?.message ?? deleteCollection.error?.message ?? subscribe.error?.message}
        </div>
      ) : null}

      {editing ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">题目与资源</h2>
              {!collection.data.isAdmin && collection.data.maxItemsPerCollection ? (
                <p className="mt-1 text-xs text-slate-500">
                  普通用户每个题单最多 {collection.data.maxItemsPerCollection} 题，当前 {draft.items.length}/
                  {collection.data.maxItemsPerCollection}
                </p>
              ) : null}
            </div>
            <button
              onClick={() =>
                setDraft((value) => ({
                  ...value,
                  items: [
                    ...value.items,
                    { clientId: crypto.randomUUID(), title: "", url: "", type: DEFAULT_COLLECTION_TYPE },
                  ],
                }))
              }
              disabled={!canAddDraftItem}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              添加条目
            </button>
          </div>
          <div className="space-y-3">
            {draft.items.map((item) => (
              <div key={item.clientId} className="grid gap-2 rounded-lg border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_130px_40px]">
                <input
                  value={item.title}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      items: value.items.map((row) =>
                        row.clientId === item.clientId ? { ...row, title: event.target.value } : row
                      ),
                    }))
                  }
                  placeholder="标题"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={item.url}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      items: value.items.map((row) =>
                        row.clientId === item.clientId ? { ...row, url: event.target.value } : row
                      ),
                    }))
                  }
                  placeholder="链接"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <select
                  value={item.type}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      items: value.items.map((row) =>
                        row.clientId === item.clientId ? { ...row, type: event.target.value } : row
                      ),
                    }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {COLLECTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    setDraft((value) => ({
                      ...value,
                      items: value.items.filter((row) => row.clientId !== item.clientId),
                    }))
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {collection.data.items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <button onClick={() => toggleItem.mutate(item.id)} className="text-slate-300 hover:text-blue-600">
                {item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-500">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium ${item.completed ? "text-slate-400 line-through" : "text-slate-900"}`}>
                  {item.title}
                </div>
                <div className="mt-1 text-xs text-slate-500">{item.type}</div>
              </div>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
