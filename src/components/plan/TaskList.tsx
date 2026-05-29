"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { fetchJson } from "@/lib/fetch-json"
import { TaskItem } from "./TaskItem"

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  priority: number
  sortOrder: number
  estimatedMinutes?: number | null
}

interface Plan {
  id?: string
  date: string
  tasks: Task[]
}

export function TaskList({ plan }: { plan: Plan }) {
  const queryClient = useQueryClient()
  const [newTitle, setNewTitle] = useState("")

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const created = await fetchJson<Plan>(`/api/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: plan.date }),
      })
      if (!created.id) throw new Error("计划创建失败")
      return fetchJson<Task>(`/api/plans/${created.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] })
      setNewTitle("")
    },
  })

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    addMutation.mutate(newTitle.trim())
  }

  const completedCount = plan.tasks.filter((t) => t.status === "completed").length
  const totalCount = plan.tasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-4">
      {totalCount > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              已完成 {completedCount}/{totalCount} 项
            </span>
            <span className="font-medium text-primary">{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {plan.tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>

      {totalCount === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <p className="text-sm text-muted-foreground">今天还没有任务</p>
          <p className="mt-1 text-xs text-muted-foreground/70">添加第一个任务开始吧</p>
        </div>
      )}

      <form onSubmit={handleAddTask} className="flex items-center gap-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/20" />
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="添加新任务，按 Enter 确认"
          className="flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
        />
        <button
          type="submit"
          disabled={!newTitle.trim() || addMutation.isPending}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-all"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>
      {addMutation.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {addMutation.error.message}
        </div>
      ) : null}
    </div>
  )
}
