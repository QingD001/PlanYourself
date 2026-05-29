import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"

type AIProvider = "anthropic" | "openai" | null

function detectProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic"
  if (process.env.OPENAI_API_KEY) return "openai"
  return null
}

function getProviderModel(provider: AIProvider): string {
  if (provider === "openai") return process.env.OPENAI_MODEL ?? "gpt-4.1"
  return process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001"
}

export async function generateStructuredResponse<T>({
  systemPrompt,
  userPrompt,
  temperature = 0.3,
}: {
  systemPrompt: string
  userPrompt: string
  temperature?: number
}): Promise<T | null> {
  const provider = detectProvider()

  if (!provider) {
    console.warn("No AI API key configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY)")
    return null
  }

  try {
    let text: string

    if (provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const msg = await anthropic.messages.create({
        model: getProviderModel(provider),
        max_tokens: 2048,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      })
      text =
        msg.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("") ?? ""
    } else {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      })
      const completion = await openai.chat.completions.create({
        model: getProviderModel(provider),
        temperature,
        max_tokens: 2048,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      })
      text = completion.choices[0]?.message?.content ?? ""
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn("No JSON found in AI response")
      return null
    }

    return JSON.parse(jsonMatch[0]) as T
  } catch (error) {
    console.error("AI call failed:", error)
    return null
  }
}

export function getActiveProvider(): AIProvider {
  return detectProvider()
}

export function isAiConfigured(): boolean {
  return detectProvider() !== null
}
