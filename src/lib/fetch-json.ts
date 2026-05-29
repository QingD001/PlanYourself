export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const text = await response.text()
  let data: unknown = null

  if (text.trim()) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`服务器返回了非 JSON 响应：${text.slice(0, 120)}`)
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `请求失败：${response.status}`
    throw new Error(message)
  }

  return data as T
}
