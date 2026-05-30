import "dotenv/config"

import { PrismaClient } from "@prisma/client"
import { writeFile } from "node:fs/promises"
import path from "node:path"

const prisma = new PrismaClient()

function getArg(name: string, fallback?: string) {
  const index = process.argv.indexOf(name)
  if (index === -1) return fallback
  return process.argv[index + 1] ?? fallback
}

function hasFlag(name: string) {
  return process.argv.includes(name)
}

async function main() {
  const fileArg = getArg("--file", "collections.export.json")!
  const userEmail = getArg("--user")
  const includePrivate = hasFlag("--include-private")
  const filePath = path.resolve(process.cwd(), fileArg)

  const collections = await prisma.learningCollection.findMany({
    where: {
      ...(includePrivate ? {} : { isPublic: true }),
      ...(userEmail ? { creator: { email: userEmail } } : {}),
    },
    orderBy: [{ createdAt: "asc" }, { title: "asc" }],
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          title: true,
          url: true,
          description: true,
          type: true,
          estimatedHours: true,
        },
      },
    },
  })

  const payload = {
    collections: collections.map((collection) => ({
      title: collection.title,
      description: collection.description ?? undefined,
      topic: collection.topic,
      type: collection.type,
      difficulty: collection.difficulty,
      isPublic: collection.isPublic,
      items: collection.items.map((item) => ({
        title: item.title,
        url: item.url ?? undefined,
        description: item.description ?? undefined,
        type: item.type,
        estimatedHours: item.estimatedHours ?? undefined,
      })),
    })),
  }

  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")

  console.log(`Exported ${collections.length} collections to ${fileArg}`)
  if (userEmail) console.log(`Filtered by owner: ${userEmail}`)
  if (!includePrivate) console.log("Private collections were excluded.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
