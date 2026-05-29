import "dotenv/config"

import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { z } from "zod"
import { DOMAIN_LEVELS, normalizeLevel } from "../src/lib/learning-domains"

const prisma = new PrismaClient()

const collectionItemSchema = z.object({
  title: z.string().trim().min(1),
  url: z.string().trim().url().optional().or(z.literal("")),
  description: z.string().trim().optional(),
  type: z.string().trim().default("article"),
  estimatedHours: z.number().positive().optional(),
})

const collectionSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  topic: z.string().trim().default("other"),
  difficulty: z
    .string()
    .trim()
    .default("beginner")
    .transform((value) => normalizeLevel(value))
    .pipe(z.enum(DOMAIN_LEVELS)),
  isPublic: z.boolean().default(true),
  items: z.array(collectionItemSchema).default([]),
})

const importFileSchema = z.union([
  collectionSchema,
  z.array(collectionSchema),
  z.object({ collections: z.array(collectionSchema) }),
])

type ImportMode = "skip" | "replace" | "append"

function getArg(name: string, fallback?: string) {
  const index = process.argv.indexOf(name)
  if (index === -1) return fallback
  return process.argv[index + 1] ?? fallback
}

function getMode(): ImportMode {
  const mode = getArg("--mode", "skip")
  if (mode === "skip" || mode === "replace" || mode === "append") return mode
  throw new Error("--mode must be one of: skip, replace, append")
}

async function ensureUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return existing

  return prisma.user.create({
    data: {
      email,
      name: email.split("@")[0],
      password: await hash(password, 12),
    },
  })
}

async function main() {
  const fileArg = getArg("--file")
  if (!fileArg) {
    throw new Error("Missing --file. Example: pnpm import:collections -- --file collections.import.json")
  }

  const ownerEmail = getArg("--user", "zhengjinlin001@ruc.edu.cn")!
  const ownerPassword = getArg("--password", "zjl191190")!
  const mode = getMode()
  const filePath = path.resolve(process.cwd(), fileArg)
  const raw = await readFile(filePath, "utf8")
  const parsed = importFileSchema.parse(JSON.parse(raw.replace(/^\uFEFF/, "")))
  const collections = Array.isArray(parsed)
    ? parsed
    : "collections" in parsed
      ? parsed.collections
      : [parsed]
  const owner = await ensureUser(ownerEmail, ownerPassword)

  let created = 0
  let skipped = 0
  let replaced = 0

  for (const collection of collections) {
    const existing = await prisma.learningCollection.findFirst({
      where: { creatorId: owner.id, title: collection.title },
      select: { id: true },
    })

    if (existing && mode === "skip") {
      skipped += 1
      console.log(`Skipped existing collection: ${collection.title}`)
      continue
    }

    if (existing && mode === "replace") {
      await prisma.learningCollection.deleteMany({
        where: { creatorId: owner.id, title: collection.title },
      })
      replaced += 1
    }

    await prisma.learningCollection.create({
      data: {
        creatorId: owner.id,
        title: collection.title,
        description: collection.description,
        topic: collection.topic,
        difficulty: collection.difficulty,
        isPublic: collection.isPublic,
        itemCount: collection.items.length,
        items: {
          create: collection.items.map((item, index) => ({
            title: item.title,
            url: item.url || null,
            description: item.description,
            type: item.type,
            estimatedHours: item.estimatedHours,
            sortOrder: index,
          })),
        },
      },
    })

    created += 1
    console.log(`Imported collection: ${collection.title}`)
  }

  console.log("")
  console.log(`Owner: ${owner.email}`)
  console.log(`Created: ${created}`)
  console.log(`Replaced: ${replaced}`)
  console.log(`Skipped: ${skipped}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
