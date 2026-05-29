import { NextResponse } from "next/server"
import { startOfDay } from "date-fns"

export class RouteError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "未登录" }, { status: 401 })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function forbidden(message = "无权限") {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function handleRouteError(error: unknown, fallback = "服务器暂时无法处理这个请求") {
  if (error instanceof RouteError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  console.error(error)
  const message = error instanceof Error && error.message ? error.message : fallback
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new RouteError(400, "请求内容必须是 JSON 对象")
    }
    return body as Record<string, unknown>
  } catch (error) {
    if (error instanceof RouteError) throw error
    throw new RouteError(400, "请求内容不是合法 JSON")
  }
}

export function parseDateInput(value: unknown, label = "日期") {
  if (typeof value !== "string" || !value.trim()) {
    throw new RouteError(400, `缺少${label}参数`)
  }

  const date = startOfDay(new Date(value))
  if (Number.isNaN(date.getTime())) {
    throw new RouteError(400, `${label}格式不正确`)
  }

  return date
}

export function parsePositiveInt(value: string | null, fallback: number, max = 100) {
  const parsed = Number.parseInt(value ?? "", 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}
