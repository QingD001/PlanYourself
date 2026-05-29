"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { Battery, Loader2, SmilePlus } from "lucide-react"
import { fetchJson } from "@/lib/fetch-json"

interface CheckIn {
  mood?: number
  energy?: number
  note?: string
}

export default function CheckInPage() {
  const today = format(new Date(), "yyyy-MM-dd")
  const [mood, setMood] = useState(4)
  const [energy, setEnergy] = useState(4)
  const [note, setNote] = useState("")

  const checkIn = useQuery<CheckIn>({
    queryKey: ["checkin", today],
    queryFn: async () => {
      const data = await fetchJson<CheckIn>(`/api/checkins?date=${today}`)
      if (data.mood) setMood(data.mood)
      if (data.energy) setEnergy(data.energy)
      if (data.note) setNote(data.note)
      return data
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      return fetchJson<CheckIn>("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, mood, energy, note }),
      })
    },
    onSuccess: () => checkIn.refetch(),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">今日打卡</h1>
        <p className="mt-2 text-sm text-slate-500">
          记录状态，不是给自己打分，是为了更了解节奏。
        </p>
      </section>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <SmilePlus className="h-4 w-4 text-blue-700" />
              心情
            </label>
            <span className="text-sm font-semibold text-blue-700">{mood}/5</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={mood}
            onChange={(event) => setMood(Number(event.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <Battery className="h-4 w-4 text-blue-700" />
              精力
            </label>
            <span className="text-sm font-semibold text-blue-700">{energy}/5</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={energy}
            onChange={(event) => setEnergy(Number(event.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800">备注</label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={5}
            placeholder="今天状态如何？有什么需要照顾的地方？"
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {save.isSuccess ? "已保存" : "保存打卡"}
        </button>
      </section>
    </div>
  )
}
