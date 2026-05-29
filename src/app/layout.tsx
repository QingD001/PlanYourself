import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Providers } from "@/components/Providers"

const inter = localFont({
  variable: "--font-inter",
  src: [
    { path: "../../public/fonts/Inter-Regular_1.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/Inter-Medium_1.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/Inter-SemiBold_1.otf", weight: "600", style: "normal" },
    { path: "../../public/fonts/Inter-Bold_1.otf", weight: "700", style: "normal" },
  ],
})

const jetBrainsMono = localFont({
  variable: "--font-jetbrains-mono",
  src: [
    { path: "../../public/fonts/JetBrainsMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/JetBrainsMono-Medium_1.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/JetBrainsMono-SemiBold_1.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/JetBrainsMono-Bold_1.ttf", weight: "700", style: "normal" },
  ],
})

export const metadata: Metadata = {
  title: "PlanYourself - 建立学习的秩序感",
  description: "面向自学 AI 群体的自我秩序管理平台",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
