'use client';

import { useGetSession } from '@/api/endpoints/sessions/sessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';

type Filter = 'none' | 'bw' | 'vintage' | 'kpop' | 'dreamy';

const filterClasses: Record<Filter, string> = {
    none: '',
    bw: 'grayscale',
    vintage: 'sepia contrast-125',
    kpop: 'saturate-150 brightness-110',
    dreamy: 'blur-[0.5px] brightness-110',
};

const FRAME_ASSETS: Record<string, string | null> = {
    'frame-1': 'https://cdn.freehihi.com/68fdab4e38d77.png',
    'frame-2': null,
    'frame-3': null,
    'frame-bao': '/frame-bao.png',
    'frame-thanh-xuan': '/frame-thanh-xuan.png',
};

const DEFAULT_FRAME_URL = 'https://cdn.freehihi.com/68fdab4e38d77.png';
const API_BASE_URL = 'https://api-photobooth.lcdkhoacntt-dut.live';

const getMediaUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const { data: response, isLoading, isError } = useGetSession(id);
    const session = response?.data;
    const photoStripRef = useRef<HTMLDivElement>(null);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const videoLoopCountsRef = useRef<number[]>([]);
    const [isStripDownloading, setIsStripDownloading] = useState(false);

    const photos = useMemo(() => (session?.medias ?? []).filter((m) => m.type === 'ORIGINAL'), [session]);
    const processedStrip = useMemo(() => session?.medias?.find((m) => m.type === 'PROCESSED') ?? null, [session]);
    const videos = useMemo(() => (session?.medias ?? []).filter((m) => m.type === 'VIDEO'), [session]);

    const rawFrameSelection = session?.selectedFrame;
    const selectedFrameId = rawFrameSelection || 'frame-1';
    const isCustomFrame = ['frame-bao', 'frame-thanh-xuan'].includes(selectedFrameId);
    const selectedFrame = FRAME_ASSETS[selectedFrameId] !== undefined
        ? (FRAME_ASSETS[selectedFrameId] ?? DEFAULT_FRAME_URL)
        : (rawFrameSelection && rawFrameSelection !== 'none' ? rawFrameSelection : DEFAULT_FRAME_URL);

    const isOpaqueFrame = selectedFrameId === 'frame-thanh-xuan';

    // Resolve filter
    const resolvedFilter: Filter = useMemo(() => {
        const candidate = session?.selectedFilter as Filter | null;
        if (candidate && filterClasses[candidate as Filter] !== undefined) {
            return candidate;
        }
        return 'none';
    }, [session?.selectedFilter]);
    const filterClass = filterClasses[resolvedFilter] ?? '';

    const downloadMedia = useCallback(async (url: string, fallbackName: string) => {
        try {
            const fullUrl = getMediaUrl(url);
            const response = await fetch(fullUrl, { mode: 'cors', credentials: 'omit', cache: 'no-cache' });
            if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            let filename = fallbackName;
            try {
                const parsed = new URL(fullUrl);
                const candidate = parsed.pathname.split('/').filter(Boolean).pop();
                if (candidate && candidate.includes('.')) filename = candidate;
            } catch { }
            anchor.href = blobUrl;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            setTimeout(() => { anchor.remove(); URL.revokeObjectURL(blobUrl); }, 100);
        } catch (error) {
            console.error('Download failed', error);
            const fb = document.createElement('a');
            fb.href = getMediaUrl(url);
            fb.target = '_blank';
            document.body.appendChild(fb);
            fb.click();
            fb.remove();
        }
    }, []);

    const handleVideoEnded = useCallback((index: number) => {
        const current = videoLoopCountsRef.current[index] ?? 0;
        if (current >= 1) return;
        videoLoopCountsRef.current[index] = current + 1;
        const el = videoRefs.current[index];
        if (el) { el.currentTime = 0; el.play().catch(console.error); }
    }, []);

    const handleDownloadStrip = useCallback(async () => {
        if (processedStrip) {
            setIsStripDownloading(true);
            try { await downloadMedia(processedStrip.url, `photoxinhh-strip-${id}.jpg`); }
            finally { setIsStripDownloading(false); }
            return;
        }
        if (!photoStripRef.current) return;
        setIsStripDownloading(true);
        try {
            const canvas = await html2canvas(photoStripRef.current, { useCORS: true, allowTaint: true, scale: 3, backgroundColor: null });
            const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.9));
            if (!blob) throw new Error('Export failed');
            const u = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = u;
            a.download = `photoxinhh-strip-${id}.jpg`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 100);
        } catch (e) {
            console.error('Strip download error', e);
        } finally { setIsStripDownloading(false); }
    }, [downloadMedia, id, processedStrip]);

    const stackedPhotoStrip = useMemo(() => {
        if (processedStrip || photos.length === 0) return [];
        const required = isCustomFrame ? 3 : 4;
        const strip = [...photos.slice(0, required)];
        let idx = 0;
        while (strip.length < required && photos.length > 0) {
            strip.push(photos[idx % photos.length]);
            idx++;
        }
        while (strip.length < required) strip.push(null);
        return strip;
    }, [photos, processedStrip, isCustomFrame]);

    const videoSlots = useMemo(() => {
        if (videos.length === 0) return [];
        const required = isCustomFrame ? 3 : 4;
        const slots: { key: string; media: any }[] = [];
        let loop = 0;
        while (slots.length < required) {
            const m = videos[slots.length % videos.length];
            slots.push({ key: `${m.id}-${loop}`, media: m });
            if (slots.length % videos.length === 0) loop++;
            if (videos.length >= required && slots.length >= required) break;
        }
        while (slots.length < required) {
            const m = videos[slots.length % videos.length];
            slots.push({ key: `${m.id}-rep-${slots.length}`, media: m });
        }
        return slots.slice(0, required);
    }, [videos, isCustomFrame]);

    const videoLoopKey = useMemo(() => videoSlots.map(s => s.key).join(','), [videoSlots]);
    useEffect(() => {
        videoRefs.current = new Array(videoSlots.length).fill(null);
        videoLoopCountsRef.current = new Array(videoSlots.length).fill(0);
    }, [videoSlots.length, videoLoopKey]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-pulse text-lg text-gray-500">Loading memories...</div></div>;
    if (isError || !session) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-lg text-red-500">Session not found.</div></div>;

    const hasPhotoStrip = Boolean(processedStrip) || stackedPhotoStrip.length > 0;
    const hasVideos = videoSlots.length > 0;

    const renderPhotoStripContent = () => {
        if (isCustomFrame) {
            return (
                <div className={`relative w-full h-full ${filterClass} ${isOpaqueFrame ? 'z-20' : ''}`}>
                    {[
                        { top: '19.5%', left: '3.8%', width: '92.4%', height: '36.5%' },
                        { top: '58.5%', left: '3.8%', width: '44.5%', height: '17.5%' },
                        { top: '77.0%', left: '51.5%', width: '44.5%', height: '17.5%' },
                    ].map((slot, index) => (
                        <div key={index} className="absolute overflow-hidden custom-slot bg-black/5 flex items-center justify-center"
                            style={{ top: slot.top, left: slot.left, width: slot.width, height: slot.height }}>
                            {stackedPhotoStrip[index] ? (
                                <img src={getMediaUrl(stackedPhotoStrip[index]!.url)} className="w-full h-full object-cover" crossOrigin="anonymous" />
                            ) : <span className="text-xs text-black/20 font-bold uppercase">Empty</span>}
                        </div>
                    ))}
                </div>
            );
        }
        return (
            <div className={`relative z-0 flex flex-col gap-0 ${filterClass}`}>
                {stackedPhotoStrip.map((photo, index) => (
                    <div key={index} className="w-full aspect-[4/3]">
                        {photo && <img src={getMediaUrl(photo.url)} className="w-full h-full object-cover" crossOrigin="anonymous" />}
                    </div>
                ))}
            </div>
        );
    };

    const renderVideoRecapContent = () => {
        if (isCustomFrame) {
            return (
                <div className={`relative w-full h-full ${isOpaqueFrame ? 'z-20' : ''}`}>
                    {[
                        { top: '19.5%', left: '3.8%', width: '92.4%', height: '36.5%' },
                        { top: '58.5%', left: '3.8%', width: '44.5%', height: '17.5%' },
                        { top: '77.0%', left: '51.5%', width: '44.5%', height: '17.5%' },
                    ].map((slot, index) => (
                        <div key={index} className="absolute overflow-hidden custom-slot bg-black"
                            style={{ top: slot.top, left: slot.left, width: slot.width, height: slot.height }}>
                            {videoSlots[index] && (
                                <video
                                    ref={el => { videoRefs.current[index] = el; }}
                                    src={getMediaUrl(videoSlots[index].media.url)}
                                    className="w-full h-full object-cover"
                                    autoPlay muted playsInline
                                    onEnded={() => handleVideoEnded(index)}
                                />
                            )}
                        </div>
                    ))}
                </div>
            );
        }
        return (
            <div className="relative z-0 flex flex-col">
                {videoSlots.map((slot, index) => (
                    <video
                        key={slot.key}
                        ref={el => { videoRefs.current[index] = el; }}
                        src={getMediaUrl(slot.media.url)}
                        className="w-full h-[240px] object-cover"
                        autoPlay muted playsInline
                        onEnded={() => handleVideoEnded(index)}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-md mx-auto space-y-6">
                <Card>
                    <CardHeader><CardTitle className="text-center">Photo Strip</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {hasPhotoStrip ? (
                            <>
                                {processedStrip ? (
                                    <div className="relative w-full max-w-[320px] mx-auto overflow-hidden rounded-xl bg-white">
                                        <img src={getMediaUrl(processedStrip.url)} alt="Processed" className="w-full h-auto object-cover" />
                                    </div>
                                ) : (
                                    <div ref={photoStripRef} className="relative w-full max-w-[320px] mx-auto overflow-hidden rounded-xl bg-white"
                                        style={isCustomFrame ? { aspectRatio: '2480/3508' } : undefined}>
                                        {renderPhotoStripContent()}
                                        {selectedFrame && (
                                            <img src={selectedFrame} crossOrigin="anonymous" className={`absolute inset-0 w-full h-full pointer-events-none ${isOpaqueFrame ? 'z-0' : 'z-10'}`} />
                                        )}
                                    </div>
                                )}
                                <Button className="w-full" onClick={handleDownloadStrip} disabled={isStripDownloading}>
                                    {isStripDownloading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Download className="mr-2 h-4 w-4" /> Save Photo Strip</>}
                                </Button>
                            </>
                        ) : <div className="text-center text-muted-foreground py-8">No photos yet.</div>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-center">Video Recap</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {hasVideos ? (
                            <>
                                <div className="relative w-full max-w-[320px] mx-auto overflow-hidden rounded-xl bg-black"
                                    style={isCustomFrame ? { aspectRatio: '2480/3508' } : undefined}>
                                    {renderVideoRecapContent()}
                                    {selectedFrame && (
                                        <img src={selectedFrame} crossOrigin="anonymous" className={`absolute inset-0 w-full h-full pointer-events-none ${isOpaqueFrame ? 'z-0' : 'z-10'}`} />
                                    )}
                                </div>
                                <Button className="w-full" onClick={() => downloadMedia(videos[0]?.url, `video-${id}.mp4`)}>
                                    <Download className="mr-2 h-4 w-4" /> Save Video
                                </Button>
                            </>
                        ) : <div className="text-center text-muted-foreground py-8">No videos yet.</div>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-center">Raw Files</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        {photos.map(p => (
                            <div key={p.id} className="space-y-2">
                                <h3 className="font-medium text-sm text-muted-foreground">Original Photo</h3>
                                <div className="rounded-lg overflow-hidden border bg-white"><img src={getMediaUrl(p.url)} className="w-full h-auto" /></div>
                                <Button variant="outline" className="w-full" onClick={() => downloadMedia(p.url, `photo-${p.id}.jpg`)}><Download className="mr-2 h-4 w-4" /> Save</Button>
                            </div>
                        ))}
                        {/* Share Button Block */}
                        <div className="pt-4 border-t text-center">
                            <Button variant="secondary" size="sm" onClick={() => {
                                navigator.share?.({ title: 'My Photobooth', url: window.location.href }).catch(() => {
                                    navigator.clipboard.writeText(window.location.href); alert('Copied!');
                                });
                            }}><Share2 className="mr-2 h-3 w-3" /> Share Link</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
