import type React from "react"
import type { Metadata } from "next"
import { Be_Vietnam_Pro } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "mapbox-gl/dist/mapbox-gl.css"
import "./globals.css"
import Providers from "./providers"

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
})

export const metadata: Metadata = {
  title: "Photobooth-XuanTinhNguyen26-fromlcdkhoacnttwithluv",
  description: "Create stunning Y2K-style photobooth memories with filters, frames, and instant sharing",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${beVietnamPro.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
