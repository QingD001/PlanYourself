import "dotenv/config"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function hasFlag(name: string) {
  return process.argv.includes(name)
}

function getArg(name: string) {
  const index = process.argv.indexOf(name)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

async function main() {
  if (!hasFlag("--yes")) {
    throw new Error("Refusing to clear collections without --yes")
  }

  const userEmail = getArg("--user")
  const where = userEmail
    ? {
        creator: {
          email: userEmail,
        },
      }
    : undefined

  const count = await prisma.learningCollection.count({ where })

  await prisma.learningCollection.deleteMany({ where })

  console.log(
    userEmail
      ? `Deleted ${count} collections owned by ${userEmail}.`
      : `Deleted ${count} collections.`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
