"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { format, startOfYear, eachDayOfInterval, endOfYear, getDay } from "date-fns"
import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { fetchJson } from "@/lib/fetch-json"

interface ActivityDay {
  date: string
  completionLevel: number
  tasksPlanned: number
  tasksCompleted: number
  hasCheckIn: boolean
  hasReflection: boolean
}

const levelColors: Record<number, string> = {
  0: "hsl(var(--heatmap-level-0))",
  1: "hsl(var(--heatmap-level-1))",
  2: "hsl(var(--heatmap-level-2))",
  3: "hsl(var(--heatmap-level-3))",
  4: "hsl(var(--heatmap-level-4))",
}

const weekLabels = ["一", "二", "三", "四", "五", "六", "日"]

export function ActivityHeatmap() {
  const router = useRouter()
  const [year, setYear] = useState(new Date().getFullYear())
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: ActivityDay } | null>(null)

  const { data: activityDays } = useQuery<ActivityDay[]>({
    queryKey: ["activity", year],
    queryFn: async () => {
      return fetchJson<ActivityDay[]>(`/api/activity?year=${year}`)
    },
  })

  const activityMap = new Map<string, ActivityDay>()
  activityDays?.forEach((d) => {
    activityMap.set(format(new Date(d.date), "yyyy-MM-dd"), d)
  })

  const yearStart = startOfYear(new Date(year, 0, 1))
  const yearEnd = endOfYear(new Date(year, 11, 31))
  const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd })

  const firstDayOfWeek = getDay(yearStart)
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const weeks: (Date | null)[][] = []
  let currentWeek: (Date | null)[] = Array(adjustedFirstDay).fill(null)

  allDays.forEach((day) => {
    currentWeek.push(day)
    const dayOfWeek = getDay(day)
    const adjusted = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    if (adjusted === 6) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  const months: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, colIdx) => {
    const firstDay = week.find((d) => d !== null)
    if (firstDay) {
      const month = firstDay.getMonth()
      if (month !== lastMonth) {
        months.push({ label: `${month + 1}月`, col: colIdx })
        lastMonth = month
      }
    }
  })

  const cellSize = 12
  const cellGap = 3
  const cellTotal = cellSize + cellGap

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">年度活跃日历</h2>
          <p className="text-sm text-muted-foreground">{year} 年学习记录</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-foreground w-12 text-center">
            {year}
          </span>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= new Date().getFullYear()}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto" onMouseLeave={() => setTooltip(null)}>
        <div className="relative" style={{ minWidth: weeks.length * cellTotal + 40 }}>
          <div className="flex mb-1 ml-8">
            {months.map((m) => (
              <div
                key={m.col}
                className="text-xs text-muted-foreground"
                style={{ marginLeft: m.col === 0 ? 0 : (m.col - (months[months.indexOf(m) - 1]?.col ?? 0)) * cellTotal - 2 }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex">
            <div className="flex flex-col mr-2 pt-0">
              {[0, 2, 4, 6].map((idx) => (
                <div key={idx} className="text-xs text-muted-foreground/60" style={{ height: cellTotal, lineHeight: `${cellTotal}px` }}>
                  {weekLabels[idx]}
                </div>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIdx) => {
                    if (!day) return <div key={dayIdx} style={{ width: cellSize, height: cellSize }} />
                    const dateStr = format(day, "yyyy-MM-dd")
                    const data = activityMap.get(dateStr)
                    const level = data?.completionLevel ?? 0

                    return (
                      <div
                        key={dateStr}
                        className="cursor-pointer rounded-sm transition-transform hover:scale-125 hover:ring-2 hover:ring-primary/50"
                        style={{
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: levelColors[level],
                        }}
                        onMouseEnter={(e) => {
                          if (!data) return
                          const rect = (e.target as HTMLElement).getBoundingClientRect()
                          setTooltip({
                            x: rect.left,
                            y: rect.top - 8,
                            data,
                          })
                        }}
                        onClick={() => router.push(`/daily/${dateStr}`)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="font-medium text-foreground">
              {format(new Date(tooltip.data.date), "yyyy年M月d日")}
            </p>
            <p className="text-muted-foreground mt-0.5">
              完成 {tooltip.data.tasksCompleted}/{tooltip.data.tasksPlanned} 项任务
              {tooltip.data.hasCheckIn && " · 已打卡"}
              {tooltip.data.hasReflection && " · 已反思"}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span>少</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="rounded-sm"
            style={{ width: 12, height: 12, backgroundColor: levelColors[level] }}
          />
        ))}
        <span>多</span>
      </div>
    </div>
  )
}
