"use client"

import { useState } from "react"
import { Camera, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import CameraStage from "@/components/camera-stage"
import Link from "next/link"

export default function PhotoBoothApp() {
  const [isBoothActive, setIsBoothActive] = useState(false)

  if (isBoothActive) {
    return <CameraStage onExit={() => setIsBoothActive(false)} />
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex items-center justify-center p-4">
      {/* Main Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          {/* Logo */}
          <motion.div className="mb-6" whileHover={{ scale: 1.05 }}>
            <h1 className="text-7xl md:text-8xl font-bold text-black">PhotoXinhh</h1>
            <p className="text-zinc-400 text-sm mt-2 tracking-widest">PHOTOBOOTH APP</p>
          </motion.div>

          <p className="text-xl md:text-2xl text-zinc-600 mb-12 leading-relaxed">
            Monochrome Minimalist Photobooth
            <br />
            <span className="text-black font-bold">Capture • Edit • Share</span>
          </p>

          {/* Start Button */}
          <div className="space-y-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                onClick={() => setIsBoothActive(true)}
                className="h-20 px-12 text-2xl rounded-full bg-black text-white hover:bg-zinc-800 font-bold"
              >
                <Camera className="w-8 h-8 mr-3" />
                Start Photobooth
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/admin">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 px-10 text-xl rounded-full border-2 border-black text-black hover:bg-zinc-100 font-bold bg-transparent"
                >
                  <History className="w-6 h-6 mr-2" />
                  Admin Dashboard
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "📸", title: "4-Photo Strip", desc: "Vertical strip layout" },
              { icon: "✨", title: "Filters & Frames", desc: "Minimal editing tools" },
              { icon: "🎬", title: "Video Recap", desc: "Records your session" },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="border-2 border-black rounded-xl p-6 text-center bg-white hover:bg-zinc-50 transition-colors"
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="font-bold text-lg mb-2 text-black">{feature.title}</h3>
                <p className="text-sm text-zinc-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
