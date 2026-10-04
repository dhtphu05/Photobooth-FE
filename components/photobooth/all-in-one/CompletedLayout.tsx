import { useEffect, useState, useRef } from 'react';
import { Loader2, RefreshCcw, Download } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBooth } from '@/context/BoothContext';
// Import the direct API function for Promise.all usage, OR use the hook's mutateAsync
import { useUploadSessionMedia, completeSession } from '@/api/endpoints/sessions/sessions';
import { useStripComposer } from '@/hooks/useStripComposer';
import { getLayoutConfig } from '@/app/config/layouts';
export const CompletedLayout = ({
    videoBlob,
    videoUrl,
    videoStatus,
    backgroundUploadsRef
}: {
    videoBlob: Blob | null;
    videoUrl: string | null;
    videoStatus: 'idle' | 'generating' | 'success' | 'error';
    backgroundUploadsRef: React.MutableRefObject<Promise<any>[]>;
}) => {
    const {
        rawPhotos, rawVideoClips, selectedPhotoIndices, selectedFrameId, selectedFilter, customMessage, signatureData,
        sessionId, resetSession, isProcessing, setProcessing
    } = useBooth();
    const layoutConfig = getLayoutConfig(selectedFrameId);
    const isLandscapeFrame = Boolean(
        layoutConfig.canvasSize && layoutConfig.canvasSize.width > layoutConfig.canvasSize.height
    );

    const [uploadState, setUploadState] = useState<'idle' | 'generating' | 'uploading' | 'done'>('generating');
    const [progress, setProgress] = useState(0);

    // Use mutateAsync for handling promises manually
    const { mutateAsync: uploadMedia } = useUploadSessionMedia();

    // 1. Generate Photo Strip
    const { blob: stripBlob, previewUrl: stripUrl, isThinking: isStripGenerating } = useStripComposer({
        uniqueId: 'completed-final',
        rawPhotos,
        selectedPhotoIndices,
        selectedFrameId,
        selectedFilter,
        customMessage,
        enabled: true // Always generate on mount
    });

    // 2. Generate Video Recap (now done in background by parent `AllInOneContent`)

    console.log('[CompletedLayout] Statuses:', { isStripGenerating, videoStatus, uploadState });

    // Master Upload Logic
    useEffect(() => {
        // 1. Wait for ALL generation to finish
        // We need to wait if:
        // - Strip is thinking
        // - Video is generating
        // - OR Video is 'idle' but we HAVE clips (meaning it hasn't started yet)
        const hasVideoClips = rawVideoClips.length > 0;
        const isVideoPending = hasVideoClips && (videoStatus === 'idle' || videoStatus === 'generating');

        if (isStripGenerating || isVideoPending) {
            setUploadState('generating');
            return;
        }

        // 2. Check if we already started uploading or finished
        if (uploadState === 'uploading' || uploadState === 'done') return;

        // 3. Start Upload Process
        const performUploads = async () => {
            if (!sessionId || sessionId.startsWith('local-')) {
                console.warn("Skipping upload for local/invalid session:", sessionId);
                setUploadState('done');
                setProcessing(false);
                return;
            }

            setUploadState('uploading');

            try {
                // A. Upload Processed Strip
                const stripPromise = stripBlob ? (async () => {
                    const file = new File([stripBlob], 'photostrip.jpg', { type: 'image/jpeg' });
                    await uploadMedia({
                        id: sessionId,
                        data: { file },
                        params: { type: 'PROCESSED' }
                    });
                    setProgress(50);
                })() : Promise.resolve();

                // Wait for strip and all background uploads
                await Promise.all([stripPromise, ...backgroundUploadsRef.current]);

                setProgress(90);

                // E. Mark Session as Completed (Important for backend)
                try {
                    await completeSession(sessionId);
                    console.log("Session marked as completed");
                } catch (err) {
                    console.error("Failed to complete session", err);
                }

                setProgress(100);
                console.log("All uploads completed successfully");
                setUploadState('done');
                setProcessing(false);

            } catch (error) {
                console.error("Batch upload failed", error);
                // Even if some fail, we move to done so user isn't stuck
                setUploadState('done');
                setProcessing(false);
            }
        };

        // Trigger if we have at least the strip (video might be null if no clips found)
        if (stripBlob) {
            performUploads();
        }

    }, [
        isStripGenerating, videoStatus,
        stripBlob, videoBlob,
        sessionId, uploadState,
        selectedPhotoIndices, rawPhotos, signatureData,
        uploadMedia, setProcessing, rawVideoClips.length
    ]);


    // QR Code URL
    const shareUrl = (typeof window !== 'undefined' && sessionId && !sessionId.startsWith('local-'))
        ? `${window.location.origin}/share/${sessionId}`
        : '';

    // Layout
    return (
        <div className="flex flex-col h-full bg-transparent p-6 md:p-8">
            {uploadState !== 'done' ? (
                <div className="flex flex-col items-center justify-center h-full rounded-3xl bg-white/90 animate-pulse space-y-6 backdrop-blur-sm">
                    <Loader2 className="w-16 h-16 text-primary animate-spin" />
                    <h2 className="text-2xl font-bold text-gray-700">
                        {uploadState === 'generating' ? "Đang xử lý ảnh & video..." : "Đang tải lên dữ liệu..."}
                    </h2>

                    {/* Progress Bar */}
                    {uploadState === 'uploading' && (
                        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}

                    <div className="text-sm text-gray-500 text-center space-y-1">
                        <p>{isStripGenerating ? "Creating photo strip..." : "Photo strip ready ✅"}</p>
                        <p>{(videoStatus === 'generating' || videoStatus === 'idle') ? "Rendering video recap..." : "Video recap ready ✅"}</p>
                    </div>
                </div>
            ) : (
                isLandscapeFrame ? (
                    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col gap-4 overflow-y-auto">
                        <header className="flex shrink-0 items-center justify-between rounded-2xl border border-white/70 bg-white/90 px-5 py-3 shadow-lg backdrop-blur-xl sm:px-7">
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                </span>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Khoảnh khắc của bạn</p>
                                    <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Hoàn tất!</h1>
                                </div>
                            </div>
                            <span className="hidden text-sm font-medium text-slate-500 sm:block">Ảnh đã sẵn sàng để tải về</span>
                        </header>

                        <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
                            <section className="flex min-h-[420px] flex-col rounded-[1.75rem] border border-white/70 bg-white/90 p-4 shadow-2xl shadow-slate-950/15 backdrop-blur-xl sm:p-6 xl:min-h-0">
                                <div className="mb-3 flex shrink-0 items-center justify-between gap-3 px-1">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">01 / Thành phẩm</p>
                                        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Ảnh của bạn</h2>
                                    </div>
                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">LANDSCAPE</span>
                                </div>

                                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-[#25334a] p-3 shadow-inner sm:p-5">
                                    {stripUrl ? (
                                        <>
                                            <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-black/20 p-1 shadow-2xl sm:p-2">
                                                <img
                                                    src={stripUrl}
                                                    alt="Ảnh photobooth hoàn tất"
                                                    className="block h-full w-full object-contain"
                                                />
                                            </div>
                                            <Button
                                                size="lg"
                                                className="shrink-0 gap-2 rounded-full bg-white px-7 font-bold text-slate-900 shadow-lg hover:bg-amber-50"
                                                onClick={() => {
                                                    const a = document.createElement('a');
                                                    a.href = stripUrl;
                                                    a.download = `photobooth-strip-${sessionId || 'capture'}.jpg`;
                                                    a.click();
                                                }}
                                            >
                                                <Download className="h-4 w-4" /> Tải ảnh chất lượng cao
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="text-sm text-white/60">Đang tải ảnh...</div>
                                    )}
                                </div>
                            </section>

                            <aside className="flex min-h-[360px] flex-col justify-center gap-4 xl:min-h-0">
                                <section className="rounded-[1.75rem] border border-white/70 bg-white/90 p-4 shadow-xl shadow-slate-950/10 backdrop-blur-xl sm:p-5">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">02 / Chuyển động</p>
                                            <h2 className="text-lg font-bold text-slate-900">Video recap</h2>
                                        </div>
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">PREVIEW</span>
                                    </div>
                                    <div
                                        className="flex w-full items-center justify-center overflow-hidden rounded-xl bg-slate-950 shadow-inner"
                                        style={{ aspectRatio: `${layoutConfig.canvasSize?.width ?? 16}/${layoutConfig.canvasSize?.height ?? 9}` }}
                                    >
                                        {videoUrl ? (
                                            <video src={videoUrl} autoPlay muted loop playsInline className="h-full w-full object-contain" />
                                        ) : (
                                            <span className="text-sm text-white/50">Đang xử lý video...</span>
                                        )}
                                    </div>
                                    {videoUrl && (
                                        <Button
                                            variant="outline"
                                            className="mt-3 w-full gap-2 rounded-xl border-slate-200 font-semibold"
                                            onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = videoUrl;
                                                a.download = `photobooth-recap-${sessionId || 'capture'}.webm`;
                                                a.click();
                                            }}
                                        >
                                            <Download className="h-4 w-4" /> Tải video
                                        </Button>
                                    )}
                                </section>

                                <section className="flex items-center gap-4 rounded-[1.75rem] border border-white/70 bg-white/90 p-4 shadow-xl shadow-slate-950/10 backdrop-blur-xl sm:p-5">
                                    <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                                        {shareUrl ? (
                                            <QRCode value={shareUrl} size={104} style={{ height: 'auto', maxWidth: '100%', width: '104px' }} viewBox="0 0 256 256" />
                                        ) : (
                                            <div className="flex h-[104px] w-[104px] items-center justify-center bg-slate-100 text-xs text-slate-400">Offline</div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">03 / Lưu về máy</p>
                                        <h2 className="mt-1 text-lg font-bold leading-tight text-slate-900">Quét mã QR</h2>
                                        <p className="mt-1 text-sm text-slate-500">Mở ảnh trên điện thoại của bạn.</p>
                                        <Button onClick={resetSession} variant="outline" className="mt-3 w-full gap-2 rounded-xl border-slate-200 font-semibold">
                                            <RefreshCcw className="h-4 w-4" /> Chụp lượt mới
                                        </Button>
                                    </div>
                                </section>
                            </aside>
                        </main>
                    </div>
                ) : (
                <div className="flex flex-col h-full max-w-6xl mx-auto w-full space-y-4 animate-in fade-in zoom-in duration-500 justify-center">

                    {/* Header */}
                    <div className="rounded-2xl bg-white/90 p-4 text-center shrink-0 shadow-lg backdrop-blur-sm">
                        <div className="bg-green-100 text-green-700 p-2 rounded-full inline-block mb-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900">Hoàn Tất!</h1>
                    </div>

                    {/* Main Content Grid - Compact Size */}
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-4 items-center">

                        {/* LEFT COLUMN: QR & Controls */}
                        <div className="lg:col-span-4 flex flex-col h-full justify-center">
                            <div className="bg-white rounded-2xl shadow-sm border p-8 flex flex-col items-center justify-center gap-8 h-fit text-center">

                                <div className="space-y-2">
                                    <h3 className="font-bold text-3xl text-gray-800">Quét Mã QR</h3>
                                    <p className="text-base text-gray-500">Tải ảnh rực rỡ về máy ngay!</p>
                                </div>

                                <div className="bg-white p-4 rounded-3xl shadow-inner border inline-block">
                                    {shareUrl ? (
                                        <QRCode
                                            value={shareUrl}
                                            size={200}
                                            style={{ height: "auto", maxWidth: "100%", width: "200px" }}
                                            viewBox={`0 0 256 256`}
                                        />
                                    ) : (
                                        <div className="w-[200px] h-[200px] bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                                            Offline
                                        </div>
                                    )}
                                </div>

                                <div className="w-full space-y-4 pt-2">
                                    
                                    <Button
                                        onClick={resetSession}
                                        size="lg"
                                        className="w-full h-14 text-lg rounded-xl shadow-md hover:shadow-lg transition-all"
                                    >
                                        <RefreshCcw className="mr-2 w-5 h-5" />
                                        Chụp Lượt Mới
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Media Previews (Smaller Size ~50-60%) */}
                        <div className="lg:col-span-8 h-full min-h-0 grid grid-cols-2 gap-8 items-center justify-center">

                            {/* Photo Strip */}
                            <div className="flex flex-col h-full bg-white/80 rounded-3xl border-2 border-dashed border-gray-200 p-10 items-center justify-center relative backdrop-blur-sm">
                                <h3 className="text-xl font-semibold text-gray-700 shrink-0 mb-4">Photo Strip</h3>
                                <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 gap-4">
                                    {stripUrl ? (
                                        <>
                                            <div className="relative w-auto h-auto max-h-[60vh] max-w-full flex items-center justify-center rounded-xl overflow-hidden shadow-xl border-[6px] border-white bg-white hover:scale-[1.02] transition-transform duration-300">
                                                <img
                                                    src={stripUrl}
                                                    alt="Result"
                                                    className="max-h-full max-w-full object-contain block"
                                                    style={{ maxHeight: '60vh' }}
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0 gap-2 border-gray-300"
                                                onClick={() => {
                                                    const a = document.createElement('a');
                                                    a.href = stripUrl;
                                                    a.download = `photobooth-strip-${sessionId || 'capture'}.jpg`;
                                                    a.click();
                                                }}
                                            >
                                                <Download className="w-4 h-4" /> Tải Ảnh
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="text-gray-400">Loading...</div>
                                    )}
                                </div>
                            </div>

                            {/* Video Recap */}
                            <div className="flex flex-col h-full bg-white/80 rounded-3xl border-2 border-dashed border-gray-200 p-10 items-center justify-center relative backdrop-blur-sm">
                                <h3 className="text-xl font-semibold text-gray-700 shrink-0 mb-4">Video Recap</h3>
                                <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 gap-4">
                                    {videoUrl ? (
                                        <>
                                            <div className="relative w-auto h-auto max-h-[45vh] max-w-full flex items-center justify-center rounded-xl overflow-hidden shadow-xl border-[6px] border-white bg-black hover:scale-[1.02] transition-transform duration-300">
                                                <video
                                                    src={videoUrl}
                                                    autoPlay
                                                    muted
                                                    loop
                                                    playsInline
                                                    className="max-h-full max-w-full object-contain block"
                                                    style={{ maxHeight: '45vh' }}
                                                />
                                            </div>
                                            {/* Optional Video Download Button for Symmetry */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0 gap-2 border-gray-300"
                                                onClick={() => {
                                                    const a = document.createElement('a');
                                                    a.href = videoUrl;
                                                    a.download = `photobooth-recap-${sessionId || 'capture'}.webm`;
                                                    a.click();
                                                }}
                                            >
                                                <Download className="w-4 h-4" /> Tải Video
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="text-gray-400">Loading...</div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
                )
            )
            }
        </div >
    );
};
