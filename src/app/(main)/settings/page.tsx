"use client"

import { useState } from "react"
import { signOut, useSession } from "next-auth/react"
import { Loader2, Trash2 } from "lucide-react"
import { fetchJson } from "@/lib/fetch-json"

export default function SettingsPage() {
  const { data: session } = useSession()
  const [confirmEmail, setConfirmEmail] = useState("")
  const [error, setError] = useState("")
  const [deleting, setDeleting] = useState(false)
  const email = session?.user?.email ?? ""
  const canDelete = confirmEmail.trim().toLowerCase() === email.toLowerCase()

  async function deleteAccount() {
    if (!canDelete || deleting) return
    const confirmed = window.confirm("确认注销账号？你的计划、打卡、反思、题单订阅和做题进度都会被删除；自己创建的题单会转交给管理员保留。")
    if (!confirmed) return

    setDeleting(true)
    setError("")
    try {
      await fetchJson<{ ok: boolean }>("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: confirmEmail }),
      })
      await signOut({ callbackUrl: "/login" })
    } catch (error) {
      setError(error instanceof Error ? error.message : "注销账号失败")
      setDeleting(false)
    }
  }

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
            value={email}
            readOnly
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-red-700">危险区域</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            注销账号会删除你的个人学习数据、订阅和完成进度；自己创建的题单会转交给管理员保留。这个操作不可恢复。
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800">输入当前邮箱确认</label>
          <input
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
            placeholder={email}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          onClick={deleteAccount}
          disabled={!canDelete || deleting}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          注销账号
        </button>
      </section>
    </div>
  )
}
