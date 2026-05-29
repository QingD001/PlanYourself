"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  priority: number
  sortOrder: number
  estimatedMinutes?: number | null
}

export function TaskItem({ task }: { task: Task }) {
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${task.id}/toggle`, { method: "PATCH" })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] })
    },
  })

  const isCompleted = task.status === "completed"

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-all duration-200 hover:border-border hover:bg-muted/50",
        isCompleted && "opacity-60"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />

      <button
        onClick={() => toggleMutation.mutate()}
        disabled={toggleMutation.isPending}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
          isCompleted
            ? "border-success bg-success"
            : "border-muted-foreground/30 hover:border-primary"
        )}
      >
        {isCompleted && (
          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <span
        className={cn(
          "flex-1 text-sm transition-all duration-200",
          isCompleted && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </span>

      {task.estimatedMinutes && (
        <span className="text-xs text-muted-foreground">
          {task.estimatedMinutes}分钟
        </span>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                deleteMutation.mutate()
                setConfirmDelete(false)
              }}
              className="rounded px-2 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/10"
            >
              确认
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
