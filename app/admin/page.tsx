"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trash2, Download, ArrowLeft, AlertTriangle, Monitor, ExternalLink } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import axios from "axios"
import { Session } from "@/api/model/session"
import { socket } from "@/lib/socket"

export default function AdminPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchSessions = async () => {
    try {
      const response = await axios.get<Session[]>('/api/sessions');
      setSessions(response.data);
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    const onSessionCreated = (newSession: Session) => {
      console.log('New session started:', newSession);
      setSessions((prev) => [newSession, ...prev]);
    };

    socket.connect();
    socket.on('session_created', onSessionCreated);

    return () => {
      socket.off('session_created', onSessionCreated);
    };
  }, []);

  const handleDownload = (session: Session) => {
    // Logic to download all media or the main strip? 
    // For now, let's look for the PROCESSED image first.
    const processedMedia = session.medias.find(m => m.type === 'PROCESSED');
    const mediaToDownload = processedMedia || session.medias[0];

    if (mediaToDownload) {
      const link = document.createElement("a")
      link.download = `photoxinhh-${session.id.substring(0, 8)}.jpg` // Assuming jpg/png
      link.href = mediaToDownload.url
      link.click()
    } else {
      alert("Chưa có ảnh để tải");
    }
  }

  // Helper to extract display image
  const getDisplayImage = (session: Session) => {
    const processed = session.medias.find(m => m.type === 'PROCESSED');
    if (processed) return processed.url;
    // Fallback to any image if processed not ready (e.g. raw captured?)
    // Usually PROCESSED is what we want for the thumbnail.
    return session.medias[0]?.url || "/placeholder.svg";
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b border-black">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-full border border-black text-black hover:bg-black/5">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">
                Admin Dashboard
              </h1>
            </div>
            <Button
              variant="outline"
              className="border-black text-black hover:bg-black/5 rounded-full"
              onClick={() => fetchSessions()}
            >
              Start Listing
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 border border-black/10 shadow-sm rounded-xl bg-white">
            <div className="text-4xl font-bold text-black">{sessions.length}</div>
            <div className="text-sm text-black/60 mt-1">Tổng Số Phiên</div>
          </Card>
          <Card className="p-6 border border-black/10 shadow-sm rounded-xl bg-white">
            <div className="text-4xl font-bold text-green-600">
              {sessions.filter((s) => s.status === "COMPLETED").length}
            </div>
            <div className="text-sm text-black/60 mt-1">Hoàn Thành</div>
          </Card>
          <Card className="p-6 border border-black/10 shadow-sm rounded-xl bg-white">
            <div className="text-4xl font-bold text-blue-600">
              {sessions.filter((s) => s.status !== "COMPLETED").length}
            </div>
            <div className="text-sm text-black/60 mt-1">Đang Thực Hiện</div>
          </Card>
        </div>

        {/* Sessions Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-black/40 text-lg">Đang tải dữ liệu...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <AlertTriangle className="w-16 h-16 mx-auto text-black/20 mb-4" />
            <p className="text-black/40 text-lg">Chưa có phiên chụp nào</p>
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
                  <Card className="overflow-hidden border border-black/10 shadow-lg hover:shadow-xl transition-shadow rounded-xl bg-white flex flex-col h-full">
                    {/* Clickable Image Area to Open Monitor */}
                    <a
                      href={`/monitor?sessionId=${session.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative aspect-[3/4] bg-black/5 group cursor-pointer overflow-hidden"
                    >
                      <img
                        src={getDisplayImage(session)}
                        alt={`Session ${session.id}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ExternalLink className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>

                      {/* Status Badge */}
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${session.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {session.status}
                      </div>
                    </a>

                    <div className="p-5 flex flex-col gap-4 flex-1">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-black/40">ID: {session.id.substring(0, 8)}</span>
                          <span className="text-xs font-medium text-black/60">
                            {new Date(session.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-xs text-black/40">
                          {new Date(session.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-auto">
                        <Button
                          onClick={() => handleDownload(session)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-black/10 text-black hover:bg-black/5 rounded-lg text-xs"
                          disabled={!session.medias.some(m => m.type === 'PROCESSED')}
                        >
                          <Download className="w-3 h-3 mr-1.5" />
                          Tải Ảnh
                        </Button>
                        <Link href={`/monitor?sessionId=${session.id}`} target="_blank" className="flex-1">
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full bg-black text-white hover:bg-black/80 rounded-lg text-xs"
                          >
                            <Monitor className="w-3 h-3 mr-1.5" />
                            Monitor
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
