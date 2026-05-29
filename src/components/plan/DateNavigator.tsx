"use client"

import { useRouter } from "next/navigation"
import { format, addDays, subDays, isToday } from "date-fns"
import { zhCN } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function DateNavigator({ dateStr }: { dateStr: string }) {
  const router = useRouter()
  const date = new Date(dateStr)
  const today = isToday(date)

  const goTo = (d: Date) => {
    router.push(`/daily/${format(d, "yyyy-MM-dd")}`)
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {format(date, "M月d日", { locale: zhCN })}
          {today && (
            <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              今天
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(date, "EEEE", { locale: zhCN })} · {format(date, "yyyy年")}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(subDays(date, 1))}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        {!today && (
          <button
            onClick={() => goTo(new Date())}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            今天
          </button>
        )}
        <button
          onClick={() => goTo(addDays(date, 1))}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
