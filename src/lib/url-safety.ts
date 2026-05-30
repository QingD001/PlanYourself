import { RouteError } from "@/lib/route-helpers"

const BLOCKED_HOST_PARTS = [
  "porn",
  "casino",
  "bet365",
  "1xbet",
  "phishing",
  "darkweb",
  "darknet",
]

const BLOCKED_URL_KEYWORDS = [
  "赌博",
  "博彩",
  "彩票",
  "色情",
  "成人",
  "裸聊",
  "诈骗",
  "洗钱",
  "毒品",
  "枪支",
  "爆炸物",
  "黑产",
  "暗网",
  "casino",
  "gambling",
  "betting",
  "porn",
  "sex",
  "nude",
  "cocaine",
  "heroin",
  "weapon",
  "explosive",
  "phishing",
  "fraud",
  "money-laundering",
  "darkweb",
  "darknet",
]

function ipv4ToNumber(value: string) {
  const parts = value.split(".").map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null
  }

  return parts.reduce((sum, part) => sum * 256 + part, 0)
}

function isPrivateIpv4(hostname: string) {
  const value = ipv4ToNumber(hostname)
  if (value === null) return false

  const ranges = [
    ["10.0.0.0", "10.255.255.255"],
    ["127.0.0.0", "127.255.255.255"],
    ["169.254.0.0", "169.254.255.255"],
    ["172.16.0.0", "172.31.255.255"],
    ["192.168.0.0", "192.168.255.255"],
    ["0.0.0.0", "0.255.255.255"],
  ] as const

  return ranges.some(([start, end]) => {
    const startValue = ipv4ToNumber(start)
    const endValue = ipv4ToNumber(end)
    return startValue !== null && endValue !== null && value >= startValue && value <= endValue
  })
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    isPrivateIpv4(normalized) ||
    BLOCKED_HOST_PARTS.some((part) => normalized.includes(part))
  )
}

function hasBlockedKeyword(url: URL) {
  const haystack = decodeURIComponent(`${url.hostname}${url.pathname}${url.search}`)
    .toLowerCase()
    .replace(/\s+/g, "")
  return BLOCKED_URL_KEYWORDS.some((keyword) => haystack.includes(keyword.toLowerCase()))
}

export function validateUserSubmittedUrl(value: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > 2048) throw new RouteError(400, "链接过长，请换一个更短的 URL")

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new RouteError(400, "链接格式不正确")
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new RouteError(400, "链接只允许使用 http 或 https")
  }

  if (url.username || url.password) {
    throw new RouteError(400, "链接不能包含用户名或密码")
  }

  if (isBlockedHostname(url.hostname)) {
    throw new RouteError(400, "该链接域名不允许提交")
  }

  if (hasBlockedKeyword(url)) {
    throw new RouteError(400, "该链接包含高风险内容关键词，无法提交")
  }

  url.hash = ""
  return url.toString()
}
