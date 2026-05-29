import "dotenv/config"

import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

const email = "zhengjinlin001@ruc.edu.cn"
const password = "zjl191190"
const legacyEmail = "demo@example.com"

async function main() {
  const hashedPassword = await hash(password, 12)
  const legacyUser = await prisma.user.findUnique({ where: { email: legacyEmail } })
  const existingUser = await prisma.user.findUnique({ where: { email } })

  if (legacyUser && !existingUser) {
    await prisma.user.update({
      where: { id: legacyUser.id },
      data: {
        email,
        name: "zhengjinlin001",
        password: hashedPassword,
        role: "admin",
      },
    })
    console.log(`Updated ${legacyEmail} to ${email}`)
    return
  }

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: existingUser.name ?? "zhengjinlin001",
        password: hashedPassword,
        role: "admin",
      },
    })
    console.log(`Reset password for ${email}`)
    return
  }

  await prisma.user.create({
    data: {
      email,
      name: "zhengjinlin001",
      password: hashedPassword,
      role: "admin",
    },
  })
  console.log(`Created ${email}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
