import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { handleRouteError, readJsonBody } from "@/lib/route-helpers"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request)
    const email = String(body.email ?? "").trim().toLowerCase()
    const password = String(body.password ?? "")
    const name = String(body.name ?? "").trim()

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码为必填项" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少需要 6 位" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 })
    }

    const hashedPassword = await hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name: name || email.split("@")[0],
        email,
        password: hashedPassword,
      },
    })

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    )
  } catch (error) {
    return handleRouteError(error, "注册失败，请稍后重试")
  }
}
