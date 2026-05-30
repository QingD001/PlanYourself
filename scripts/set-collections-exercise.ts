import "dotenv/config"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const [collections, items] = await Promise.all([
    prisma.learningCollection.updateMany({
      data: { type: "exercise" },
    }),
    prisma.collectionItem.updateMany({
      data: { type: "exercise" },
    }),
  ])

  console.log(`Updated collections: ${collections.count}`)
  console.log(`Updated items: ${items.count}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
