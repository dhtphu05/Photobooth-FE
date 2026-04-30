"use client"

import { useState } from "react"
import { ArrowRight, Camera, Check, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import CameraStage from "@/components/camera-stage"
import Link from "next/link"
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
})

export default function PhotoBoothApp() {
  const [isBoothActive, setIsBoothActive] = useState(false)

  if (isBoothActive) {
    return <CameraStage onExit={() => setIsBoothActive(false)} />
  }

  return (
    <main className={`${inter.className} min-h-screen bg-white text-black`}>
      <div className="mx-auto min-h-screen max-w-6xl border-x border-black/10 px-5 pb-14 pt-6 md:px-8 md:pb-20">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between border-b border-black/10 pb-4"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/60">Photobooth Self-Service</p>
          <Link href="/admin">
            <Button
              variant="outline"
              className="h-10 rounded-full border border-black/15 bg-transparent px-4 text-sm font-medium text-black hover:bg-black/5"
            >
              <History className="mr-2 h-4 w-4" />
              Admin
            </Button>
          </Link>
        </motion.header>

        <section className="grid gap-10 border-b border-black/10 py-12 md:grid-cols-[1.25fr_0.75fr] md:py-20">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-8">
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Dành cho sự kiện, vận hành mượt tại chỗ</p>
              <h1 className="max-w-4xl text-4xl font-semibold leading-[0.96] tracking-[-0.04em] sm:text-5xl md:text-7xl">
                Chụp 6 ảnh, chọn 4 ảnh đẹp nhất, xuất photostrip và recap ngay tại booth.
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-black/65 md:text-lg">
                Một flow liền mạch cho người dùng phổ thông: chọn frame, đặt timer, thêm lời nhắn và chữ ký, sau đó tải về bằng QR trong vài
                chạm.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  onClick={() => setIsBoothActive(true)}
                  className="group h-14 rounded-full border border-black bg-black px-8 text-base font-semibold text-white hover:bg-black/90"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Bắt đầu chụp
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </motion.div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-black/45">Khởi chạy camera tức thì</p>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="self-end rounded-2xl border border-black/10 p-6"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-black/50">Session Flow</p>
            <div className="mt-4 space-y-4">
              {[
                { step: "01", title: "Frame + Timer", desc: "Chọn khung sự kiện và thời gian đếm ngược 5/7/10 giây." },
                { step: "02", title: "Capture + Select", desc: "Chụp liên tiếp 6 ảnh, sau đó chọn đúng 4 ảnh để lên strip." },
                { step: "03", title: "Review + Share", desc: "Thêm lời nhắn/chữ ký, xuất recap video và nhận QR tải về." },
              ].map((item) => (
                <div key={item.step} className="border-t border-black/10 pt-4 first:border-t-0 first:pt-0">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-black/40">{item.step}</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">{item.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-black/60">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.aside>
        </section>

        <section className="grid gap-0 border-b border-black/10 md:grid-cols-3">
          {[
            { stat: "6 → 4", label: "Chụp 6 ảnh và chọn 4 ảnh đẹp nhất" },
            { stat: "14+", label: "Mẫu frame sẵn cho nhiều concept sự kiện" },
            { stat: "QR + Video", label: "Tải photostrip và recap ngay trên điện thoại" },
          ].map((item, index) => (
            <motion.article
              key={item.stat}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + index * 0.06 }}
              className="border-black/10 px-5 py-8 md:px-6 md:py-10 [&:not(:last-child)]:border-b md:[&:not(:last-child)]:border-b-0 md:[&:not(:last-child)]:border-r"
            >
              <p className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">{item.stat}</p>
              <p className="mt-2 text-sm leading-relaxed text-black/60">{item.label}</p>
            </motion.article>
          ))}
        </section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-10 rounded-3xl border border-black/15 bg-black px-6 py-8 text-white md:px-10 md:py-12"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Call To Action</p>
              <h3 className="text-2xl font-semibold leading-tight tracking-[-0.03em] md:text-4xl">
                Sẵn sàng chạy một phiên photobooth hoàn chỉnh ngay bây giờ?
              </h3>
              <div className="pt-2 text-sm text-white/75">
                <p className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Không cần đào tạo người dùng trước
                </p>
                <p className="mt-2 inline-flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Có kết quả strip + recap + QR sau một flow duy nhất
                </p>
              </div>
            </div>
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                onClick={() => setIsBoothActive(true)}
                className="group h-14 rounded-full border border-white bg-white px-8 text-base font-semibold text-black hover:bg-white/95"
              >
                <Camera className="mr-2 h-5 w-5" />
                Vào phiên chụp ngay
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </div>
        </motion.section>
      </div>
    </main>
  )
}
