"use client"

import { cn } from "@/lib/utils"

const moods = [
  { value: 1, emoji: "😫", label: "很差" },
  { value: 2, emoji: "😕", label: "不太好" },
  { value: 3, emoji: "😐", label: "一般" },
  { value: 4, emoji: "😊", label: "不错" },
  { value: 5, emoji: "🤩", label: "很棒" },
]

export function MoodSelector({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex gap-2">
      {moods.map((mood) => (
        <button
          key={mood.value}
          type="button"
          onClick={() => onChange(mood.value)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl border-2 px-4 py-3 transition-all duration-200",
            value === mood.value
              ? "border-primary bg-primary/10 scale-105"
              : "border-transparent hover:border-border hover:bg-muted"
          )}
        >
          <span className="text-2xl">{mood.emoji}</span>
          <span className="text-xs text-muted-foreground">{mood.label}</span>
        </button>
      ))}
    </div>
  )
}
