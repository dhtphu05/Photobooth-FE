"use client"

import { Session } from "@/api/model/session"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, ExternalLink, Monitor, Share2 } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"

interface SessionListProps {
    sessions: Session[]
    isLoading: boolean
}

export function SessionList({ sessions, isLoading }: SessionListProps) {
    const getDisplayImage = (session: Session) => {
        const medias = session.medias || [];
        const processed = medias.find(m => m.type === 'PROCESSED');
        if (processed) return processed.url;
        return medias[0]?.url || "/placeholder.svg";
    }

    const handleDownload = (session: Session) => {
        const medias = session.medias || [];
        const processedMedia = medias.find(m => m.type === 'PROCESSED');
        const mediaToDownload = processedMedia || medias[0];

        if (mediaToDownload) {
            const link = document.createElement("a")
            link.download = `photoxinhh-${session.id.substring(0, 8)}.jpg`
            link.href = mediaToDownload.url
            link.click()
        } else {
            alert("Chưa có ảnh để tải");
        }
    }

    if (isLoading) {
        return (
            <div className="text-center py-20">
                <p className="text-black/40 text-lg">Đang tải dữ liệu...</p>
            </div>
        )
    }

    if (sessions.length === 0) {
        return (
            <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Monitor className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-black/40 text-lg">Không tìm thấy phiên chụp nào</p>
            </div>
        )
    }

    return (
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
                            {/* Clickable Image Area */}
                            <div className="relative aspect-[3/4] bg-black/5 group overflow-hidden">
                                <img
                                    src={getDisplayImage(session)}
                                    alt={`Session ${session.id}`}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    <Link href={`/monitor?sessionId=${session.id}`} target="_blank">
                                        <Button variant="secondary" size="icon" className="rounded-full h-12 w-12 bg-white/90 hover:bg-white" title="Open Monitor">
                                            <Monitor className="w-5 h-5 text-black" />
                                        </Button>
                                    </Link>
                                    <Link href={`/share/${session.id}`} target="_blank">
                                        <Button variant="secondary" size="icon" className="rounded-full h-12 w-12 bg-white/90 hover:bg-white" title="Open Share Page">
                                            <Share2 className="w-5 h-5 text-black" />
                                        </Button>
                                    </Link>
                                </div>

                                {/* Status Badge */}
                                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${session.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                    'bg-blue-100 text-blue-700'
                                    }`}>
                                    {session.status}
                                </div>
                            </div>

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
                                        disabled={!(session.medias || []).some(m => m.type === 'PROCESSED')}
                                    >
                                        <Download className="w-3 h-3 mr-1.5" />
                                        Tải Ảnh
                                    </Button>

                                    <Link href={`/monitor?sessionId=${session.id}`} target="_blank" className="flex-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-black/10 text-black hover:bg-black/5 rounded-lg text-xs"
                                        >
                                            <Monitor className="w-3 h-3 mr-1.5" />
                                            Monitor
                                        </Button>
                                    </Link>

                                    <Link href={`/share/${session.id}`} target="_blank" className="flex-1">
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="w-full bg-black text-white hover:bg-black/80 rounded-lg text-xs"
                                        >
                                            <ExternalLink className="w-3 h-3 mr-1.5" />
                                            Share
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
