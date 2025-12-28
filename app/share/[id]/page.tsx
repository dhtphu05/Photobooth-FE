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

    const photos = useMemo(() => {
        return (session?.medias ?? []).filter((m) => m.type === 'ORIGINAL');
    }, [session]);

    const processedStrip = useMemo(() => {
        return session?.medias?.find((m) => m.type === 'PROCESSED') ?? null;
    }, [session]);

    const videos = useMemo(() => {
        return (session?.medias ?? []).filter((m) => m.type === 'VIDEO');
    }, [session]);

    const downloadMedia = useCallback(async (url: string, fallbackName: string) => {
        try {
            const fullUrl = getMediaUrl(url);
            const response = await fetch(fullUrl, {
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-cache',
            });
            if (!response.ok) {
                throw new Error(`Failed to download media: ${response.statusText}`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const anchor = document.createElement('a');

            let filename = fallbackName;
            try {
                const parsedUrl = new URL(fullUrl);
                const candidate = parsedUrl.pathname.split('/').filter(Boolean).pop();
                if (candidate) {
                    filename = candidate.includes('.') ? candidate : fallbackName;
                }
            } catch {
                // ignore parse failures and fall back to provided name
            }

            anchor.href = blobUrl;
            anchor.download = filename;
            anchor.rel = 'noopener noreferrer';
            document.body.appendChild(anchor);
            anchor.click();
            setTimeout(() => {
                anchor.remove();
                URL.revokeObjectURL(blobUrl);
            }, 100);
        } catch (error) {
            console.error('Unable to download media', error);
            const fallbackAnchor = document.createElement('a');
            fallbackAnchor.href = getMediaUrl(url);
            fallbackAnchor.target = '_blank';
            fallbackAnchor.rel = 'noopener noreferrer';
            document.body.appendChild(fallbackAnchor);
            fallbackAnchor.click();
            fallbackAnchor.remove();
        }
    }, []);

    const handleVideoEnded = useCallback((index: number) => {
        const currentRepeats = videoLoopCountsRef.current[index] ?? 0;
        if (currentRepeats >= 1) {
            return;
        }

        videoLoopCountsRef.current[index] = currentRepeats + 1;
        const element = videoRefs.current[index];
        if (element) {
            element.currentTime = 0;
            element.play().catch((error) => {
                console.error('Unable to replay video clip', error);
            });
        }
    }, []);

    const handleDownloadStrip = useCallback(async () => {
        if (processedStrip) {
            setIsStripDownloading(true);
            try {
                await downloadMedia(processedStrip.url, `photoxinhh-strip-${id}.jpg`);
            } finally {
                setIsStripDownloading(false);
            }
            return;
        }

        if (!photoStripRef.current) {
            return;
        }

        setIsStripDownloading(true);
        try {
            const canvas = await html2canvas(photoStripRef.current, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                scale: 3,
            });

            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.9);
            });

            if (!blob) {
                throw new Error('Unable to export strip image');
            }

            const blobUrl = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = blobUrl;
            anchor.download = `photoxinhh-strip-${id}.jpg`;
            document.body.appendChild(anchor);
            anchor.click();
            setTimeout(() => {
                anchor.remove();
                URL.revokeObjectURL(blobUrl);
            }, 100);
        } catch (error) {
            console.error('Unable to download photo strip', error);
        } finally {
            setIsStripDownloading(false);
        }
    }, [downloadMedia, id, processedStrip]);

    const stackedPhotoStrip = useMemo<((typeof photos)[number] | null)[]>(() => {
        if (processedStrip || photos.length === 0) {
            return [];
        }

        const strip: ((typeof photos)[number] | null)[] = [...photos.slice(0, 4)];
        let duplicationIndex = 0;
        while (strip.length < 4 && photos.length > 0) {
            strip.push(photos[duplicationIndex % photos.length] ?? null);
            duplicationIndex += 1;
        }
        while (strip.length < 4) {
            strip.push(null);
        }
        return strip;
    }, [photos, processedStrip]);

    const videoSlots = useMemo(() => {
        if (videos.length === 0) {
            return [];
        }
        const slots: { key: string; media: (typeof videos)[number] }[] = [];
        let loop = 0;
        while (slots.length < 4) {
            const media = videos[slots.length % videos.length];
            slots.push({ key: `${media.id}-${loop}`, media });
            if ((slots.length % videos.length) === 0) {
                loop += 1;
            }
            if (videos.length >= 4 && slots.length >= 4) {
                break;
            }
        }
        while (slots.length < 4) {
            const media = videos[slots.length % videos.length];
            slots.push({ key: `${media.id}-repeat-${slots.length}`, media });
        }
        return slots.slice(0, 4);
    }, [videos]);

    const rawFrameSelection = session?.selectedFrame;
    const selectedFrame = rawFrameSelection === '' || rawFrameSelection === 'none'
        ? null
        : rawFrameSelection ?? DEFAULT_FRAME_URL;
    const resolvedFilter: Filter = useMemo(() => {
        const candidate = session?.selectedFilter as Filter | null;
        if (candidate && filterClasses[candidate as Filter] !== undefined) {
            return candidate;
        }
        return 'none';
    }, [session?.selectedFilter]);
    const filterClass = filterClasses[resolvedFilter] ?? '';
    const videoLoopKey = useMemo(() => videoSlots.map((slot) => slot.key).join(','), [videoSlots]);

    useEffect(() => {
        videoRefs.current = new Array(videoSlots.length).fill(null);
        videoLoopCountsRef.current = new Array(videoSlots.length).fill(0);
    }, [videoSlots.length, videoLoopKey]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-pulse text-lg font-medium text-gray-500">Loading your memories...</div>
            </div>
        );
    }

    if (isError || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-lg font-medium text-red-500">Session not found or expired.</div>
            </div>
        );
    }

    const hasStackedStrip = stackedPhotoStrip.length > 0;
    const hasPhotoStrip = Boolean(processedStrip) || hasStackedStrip;
    const hasVideos = videoSlots.length > 0;

    const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* iOS Hint */}
                {isIOS && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    Nếu bạn dùng <strong>iPhone</strong>, vui lòng mở bằng <strong>Safari</strong> để tải ảnh/video dễ dàng nhất nhé!
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-center text-2xl md:text-3xl">Photo Strip</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-1 flex flex-col justify-center">
                            {hasPhotoStrip ? (
                                <>
                                    {processedStrip ? (
                                        <div className="relative w-fit mx-auto overflow-hidden rounded-xl bg-white shadow-lg">
                                            <img
                                                src={getMediaUrl(processedStrip.url)}
                                                alt="Processed strip"
                                                className="block w-auto h-auto max-w-full max-h-[70vh]"
                                            />
                                        </div>
                                    ) : (
                                        <div ref={photoStripRef} className="relative w-full max-w-[400px] md:max-w-full mx-auto overflow-hidden rounded-xl bg-white shadow-lg">
                                            <div className={`relative z-0 flex flex-col gap-0 ${filterClass}`}>
                                                {stackedPhotoStrip.map((photo, index) => (
                                                    <div key={photo?.id ?? index} className="w-full aspect-[4/3]">
                                                        {photo ? (
                                                            <img
                                                                src={getMediaUrl(photo.url)}
                                                                alt={`Session Photo ${index + 1}`}
                                                                className="w-full h-full object-cover"
                                                                crossOrigin="anonymous"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-sm text-zinc-500">
                                                                Photo {index + 1}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            {selectedFrame && (
                                                <img
                                                    src={selectedFrame}
                                                    crossOrigin="anonymous"
                                                    alt="Frame overlay"
                                                    className="absolute inset-0 z-10 w-full h-full pointer-events-none"
                                                />
                                            )}
                                        </div>
                                    )}
                                    <Button
                                        className="w-full h-12 text-lg"
                                        onClick={handleDownloadStrip}
                                        disabled={isStripDownloading}
                                    >
                                        {isStripDownloading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Đang chuẩn bị...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-2 h-5 w-5" /> Tải Ảnh Về
                                            </>
                                        )}
                                    </Button>
                                </>
                            ) : (
                                <div className="text-center text-muted-foreground py-12">
                                    Chưa có ảnh nào.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-center text-2xl md:text-3xl">Video Recap</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-1 flex flex-col justify-center">
                            {hasVideos ? (
                                <>
                                    <div className="relative w-fit mx-auto overflow-hidden rounded-xl bg-black shadow-lg">
                                        <div className="relative z-0 flex flex-col h-full items-center justify-center">
                                            <video
                                                ref={(element) => {
                                                    videoRefs.current[0] = element;
                                                }}
                                                src={getMediaUrl(videos[0].url)}
                                                autoPlay
                                                muted
                                                playsInline
                                                loop
                                                className="block w-auto h-auto max-w-full max-h-[70vh]"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full h-12 text-lg"
                                        onClick={() => {
                                            if (videos[0]) {
                                                downloadMedia(videos[0].url, `photoxinhh-video-${videos[0].id}.mp4`);
                                            }
                                        }}
                                    >
                                        <Download className="mr-2 h-5 w-5" /> Tải Video Về
                                    </Button>
                                </>
                            ) : (
                                <div className="text-center text-muted-foreground py-12">Chưa có video nào.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-center">Raw Files</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {processedStrip && (
                            <div className="space-y-2">
                                <h3 className="font-medium text-sm text-muted-foreground">Ảnh Đã Ghép</h3>
                                <div className="rounded-lg overflow-hidden border bg-white">
                                    <img src={getMediaUrl(processedStrip.url)} alt="Processed strip" className="w-full h-auto" />
                                </div>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => downloadMedia(processedStrip.url, `photoxinhh-strip-${processedStrip.id}.jpg`)}
                                >
                                    <Download className="mr-2 h-4 w-4" /> Tải Ảnh Dải
                                </Button>
                            </div>
                        )}

                        {photos.map((photo) => (
                            <div key={photo.id} className="space-y-2">
                                <h3 className="font-medium text-sm text-muted-foreground">Ảnh Gốc</h3>
                                <div className="rounded-lg overflow-hidden border bg-white">
                                    <img src={getMediaUrl(photo.url)} alt="Session Photo" className="w-full h-auto" />
                                </div>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => downloadMedia(photo.url, `photoxinhh-photo-${photo.id}.jpg`)}
                                >
                                    <Download className="mr-2 h-4 w-4" /> Download Photo
                                </Button>
                            </div>
                        ))}

                        {videos.map((video) => (
                            <div key={video.id} className="space-y-2">
                                <h3 className="font-medium text-sm text-muted-foreground">Video Clip</h3>
                                <div className="rounded-lg overflow-hidden border bg-black aspect-video flex items-center justify-center">
                                    <video src={getMediaUrl(video.url)} controls className="w-full h-full" />
                                </div>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => downloadMedia(video.url, `photoxinhh-video-${video.id}.mp4`)}
                                >
                                    <Download className="mr-2 h-4 w-4" /> Download Video
                                </Button>
                            </div>
                        ))}

                        {photos.length === 0 && videos.length === 0 && !processedStrip && (
                            <div className="text-center text-muted-foreground py-8">
                                No media uploaded yet.
                            </div>
                        )}

                        <div className="pt-4 border-t text-center">
                            <p className="text-xs text-muted-foreground mb-2">Share this page</p>
                            <Button variant="secondary" size="sm" onClick={() => {
                                navigator.share?.({
                                    title: 'My Photobooth Session',
                                    url: window.location.href
                                }).catch(() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    alert('Link copied to clipboard!');
                                });
                            }}>
                                <Share2 className="mr-2 h-3 w-3" /> Share Link
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
