import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"
import { subDays, startOfDay } from "date-fns"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  const password = await hash("zjl191190", 12)
  const user = await prisma.user.upsert({
    where: { email: "zhengjinlin001@ruc.edu.cn" },
    create: {
      email: "zhengjinlin001@ruc.edu.cn",
      name: "小明",
      password,
      role: "admin",
    },
    update: { password, role: "admin" },
  })

  console.log(`Created user: ${user.email}`)

  const collections = []
  for (const c of [
    {
      title: "Python 机器学习入门",
      description: "从零开始学习 Python 和机器学习基础知识",
      topic: "machine-learning",
      difficulty: "beginner",
      items: [
        { title: "Python 基础语法", type: "course", url: "https://docs.python.org/zh-cn/3/tutorial/" },
        { title: "NumPy 快速入门", type: "article", url: "https://numpy.org/doc/stable/user/quickstart.html" },
        { title: "Pandas 数据处理", type: "course", url: "https://pandas.pydata.org/docs/getting_started/" },
        { title: "Matplotlib 可视化", type: "article" },
        { title: "Scikit-learn 入门", type: "course", url: "https://scikit-learn.org/stable/tutorial/" },
        { title: "线性回归从零实现", type: "exercise" },
        { title: "KNN 分类器实践", type: "exercise" },
      ],
    },
    {
      title: "深度学习基础",
      description: "掌握神经网络和深度学习核心概念",
      topic: "deep-learning",
      difficulty: "intermediate",
      items: [
        { title: "神经网络数学基础", type: "article" },
        { title: "PyTorch 入门教程", type: "course", url: "https://pytorch.org/tutorials/" },
        { title: "反向传播推导", type: "article" },
        { title: "CNN 卷积神经网络", type: "video" },
        { title: "RNN 和 LSTM", type: "article" },
        { title: "Transformer 架构详解", type: "article" },
        { title: "手写数字识别项目", type: "project" },
      ],
    },
    {
      title: "NLP 自然语言处理",
      description: "学习文本处理和语言模型相关技术",
      topic: "nlp",
      difficulty: "intermediate",
      items: [
        { title: "文本预处理与分词", type: "article" },
        { title: "词向量与 Word2Vec", type: "course" },
        { title: "注意力机制详解", type: "article" },
        { title: "BERT 模型原理", type: "article" },
        { title: "HuggingFace 实战", type: "course", url: "https://huggingface.co/learn" },
        { title: "文本分类项目", type: "project" },
        { title: "情感分析实战", type: "exercise" },
      ],
    },
    {
      title: "AI 数学基础",
      description: "掌握机器学习所需的数学知识",
      topic: "math",
      difficulty: "beginner",
      items: [
        { title: "线性代数基础", type: "course" },
        { title: "概率论与统计", type: "book" },
        { title: "微积分要点", type: "article" },
        { title: "信息论基础", type: "article" },
        { title: "优化算法概述", type: "video" },
      ],
    },
    {
      title: "计算机视觉",
      description: "学习图像处理和计算机视觉技术",
      topic: "computer-vision",
      difficulty: "advanced",
      items: [
        { title: "图像处理基础", type: "article" },
        { title: "OpenCV 入门", type: "course" },
        { title: "目标检测算法", type: "article" },
        { title: "YOLO 系列模型", type: "video" },
        { title: "图像分割实战", type: "project" },
        { title: "GAN 生成对抗网络", type: "article" },
      ],
    },
    {
      title: "Python 编程基础",
      description: "适合零基础的 Python 编程入门",
      topic: "python-basics",
      difficulty: "beginner",
      items: [
        { title: "环境搭建与 Hello World", type: "article" },
        { title: "变量与数据类型", type: "course" },
        { title: "条件判断与循环", type: "exercise" },
        { title: "函数与模块", type: "article" },
        { title: "面向对象编程", type: "video" },
        { title: "文件操作", type: "exercise" },
        { title: "小型项目：待办事项应用", type: "project" },
      ],
    },
  ]) {
    const collection = await prisma.learningCollection.create({
      data: {
        creatorId: user.id,
        title: c.title,
        description: c.description,
        topic: c.topic,
        difficulty: c.difficulty,
        isPublic: true,
        items: {
          create: c.items.map((item, i) => ({ ...item, sortOrder: i })),
        },
      },
    })
    collections.push(collection)
    console.log(`Created collection: ${collection.title}`)
  }

  for (let i = 0; i < 30; i++) {
    const date = startOfDay(subDays(new Date(), i))
    const tasksPlanned = Math.floor(Math.random() * 5) + 1
    const tasksCompleted = Math.floor(Math.random() * (tasksPlanned + 1))
    const hasCheckIn = Math.random() > 0.3
    const hasReflection = Math.random() > 0.5

    let completionLevel = 0
    if (tasksPlanned > 0) {
      const ratio = tasksCompleted / tasksPlanned
      if (ratio >= 1) completionLevel = 4
      else if (ratio >= 0.75) completionLevel = 3
      else if (ratio >= 0.5) completionLevel = 2
      else if (ratio > 0) completionLevel = 1
    }

    await prisma.activityDay.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: { userId: user.id, date, tasksPlanned, tasksCompleted, completionLevel, hasCheckIn, hasReflection },
      update: { tasksPlanned, tasksCompleted, completionLevel, hasCheckIn, hasReflection },
    })

    if (hasCheckIn) {
      await prisma.checkIn.upsert({
        where: { userId_date: { userId: user.id, date } },
        create: {
          userId: user.id,
          date,
          mood: Math.floor(Math.random() * 3) + 2,
          energy: Math.floor(Math.random() * 3) + 2,
        },
        update: {},
      })
    }

    if (hasReflection) {
      await prisma.reflection.upsert({
        where: { userId_date: { userId: user.id, date } },
        create: {
          userId: user.id,
          date,
          content: `今天学习了${tasksCompleted}项内容，收获很大。`,
          productivity: Math.floor(Math.random() * 3) + 2,
          focus: Math.floor(Math.random() * 3) + 2,
          learningSummary: "今天的学习内容充实，状态不错",
        },
        update: {},
      })
    }

    if (i === 0) {
      const plan = await prisma.dailyPlan.create({
        data: { userId: user.id, date },
      })
      for (let j = 0; j < tasksPlanned; j++) {
        await prisma.task.create({
          data: {
            dailyPlanId: plan.id,
            title: ["复习 Python 基础", "阅读论文", "做练习题", "看视频教程", "整理笔记"][j % 5],
            status: j < tasksCompleted ? "completed" : "todo",
            sortOrder: j,
            completedAt: j < tasksCompleted ? new Date() : null,
          },
        })
      }
    }
  }

  console.log("Created 30 days of activity data")

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      strengths: JSON.stringify(["学习持续性强", "计划执行力好", "反思习惯良好"]),
      weaknesses: JSON.stringify(["深度学习时间不足", "项目实践偏少"]),
      learningStyle: "visual",
      preferredTopics: JSON.stringify(["机器学习", "Python 基础"]),
      domainLevels: JSON.stringify({
        "machine-learning": "beginner",
        "computer-vision": "beginner",
        nlp: "beginner",
        algorithm: "intermediate",
        "llm-training": "beginner",
      }),
      studyConsistency: 0.73,
      averageDailyStudyMin: 85,
    },
    update: {},
  })

  console.log("Seeding complete!")
  console.log("Demo account: zhengjinlin001@ruc.edu.cn / zjl191190")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
