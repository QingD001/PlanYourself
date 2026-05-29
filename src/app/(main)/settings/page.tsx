"use client"

import { useSession } from "next-auth/react"

export default function SettingsPage() {
  const { data: session } = useSession()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">设置</h1>
        <p className="mt-2 text-sm text-slate-500">查看当前账号信息。</p>
      </section>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800">昵称</label>
          <input
            value={session?.user?.name ?? ""}
            readOnly
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800">邮箱</label>
          <input
            value={session?.user?.email ?? ""}
            readOnly
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          />
        </div>
      </section>
    </div>
  )
}
