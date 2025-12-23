"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StorageManager, type PhotoSession } from "@/lib/storage-manager"
import { Trash2, Download, ArrowLeft, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

export default function AdminPage() {
  const [sessions, setSessions] = useState<PhotoSession[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    setSessions(StorageManager.getAllSessions())
  }, [])

  const handleDelete = (id: string) => {
    StorageManager.deleteSession(id)
    setSessions(StorageManager.getAllSessions())
    setShowDeleteConfirm(null)
  }

  const handleClearAll = () => {
    if (confirm("Bạn có chắc muốn xóa tất cả lịch sử chụp không?")) {
      StorageManager.clearAllSessions()
      setSessions([])
    }
  }

  const handleDownload = (session: PhotoSession) => {
    const link = document.createElement("a")
    link.download = `photoxinhh-${session.id.substring(0, 8)}.png`
    link.href = session.photoDataUrl
    link.click()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-black">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-full border border-black">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>
            </div>
            {sessions.length > 0 && (
              <Button
                onClick={handleClearAll}
                variant="outline"
                className="border-black text-black hover:bg-zinc-100 rounded-full bg-transparent"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa Tất Cả
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 border-2 border-black rounded-xl bg-white">
            <div className="text-4xl font-bold text-black">{sessions.length}</div>
            <div className="text-sm text-zinc-600 mt-1">Tổng Số Phiên</div>
          </Card>
          <Card className="p-6 border-2 border-black rounded-xl bg-white">
            <div className="text-4xl font-bold text-black">
              {sessions.filter((s) => s.deviceType === "Mobile").length}
            </div>
            <div className="text-sm text-zinc-600 mt-1">Mobile</div>
          </Card>
          <Card className="p-6 border-2 border-black rounded-xl bg-white">
            <div className="text-4xl font-bold text-black">
              {sessions.filter((s) => s.deviceType === "Desktop").length}
            </div>
            <div className="text-sm text-zinc-600 mt-1">Desktop</div>
          </Card>
        </div>

        {/* Sessions Grid */}
        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <AlertTriangle className="w-16 h-16 mx-auto text-zinc-300 mb-4" />
            <p className="text-zinc-400 text-lg">Chưa có phiên chụp nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <Card className="overflow-hidden border-2 border-black rounded-xl bg-white">
                    <div className="aspect-[3/4] bg-zinc-100 relative">
                      <img
                        src={session.photoDataUrl || "/placeholder.svg"}
                        alt={`Session ${session.id}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="text-xs text-zinc-600 space-y-1">
                        <div className="font-mono">{new Date(session.timestamp).toLocaleString("vi-VN")}</div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-zinc-100 rounded-full text-[10px] font-bold">
                            {session.deviceType}
                          </span>
                          <span className="font-mono text-zinc-400">ID: {session.id.substring(0, 8)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDownload(session)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-black text-black hover:bg-zinc-100 rounded-full"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Tải
                        </Button>
                        <Button
                          onClick={() => setShowDeleteConfirm(session.id)}
                          variant="outline"
                          size="sm"
                          className="border-black text-black hover:bg-red-50 rounded-full"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 max-w-sm w-full border-2 border-black"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-2">Xác Nhận Xóa</h3>
              <p className="text-zinc-600 mb-6">Bạn có chắc muốn xóa phiên chụp này không?</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowDeleteConfirm(null)}
                  variant="outline"
                  className="flex-1 border-black text-black hover:bg-zinc-100 rounded-full"
                >
                  Hủy
                </Button>
                <Button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 bg-black text-white hover:bg-zinc-800 rounded-full"
                >
                  Xóa
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
