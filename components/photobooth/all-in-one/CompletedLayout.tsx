import { useEffect, useState, useRef } from 'react';
import { Loader2, RefreshCcw, Download } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBooth } from '@/context/BoothContext';
// Import the direct API function for Promise.all usage, OR use the hook's mutateAsync
import { useUploadSessionMedia, completeSession } from '@/api/endpoints/sessions/sessions';
import { useStripComposer } from '@/hooks/useStripComposer';
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
        <div className="flex flex-col h-full bg-gray-50 p-6 md:p-8">
            {uploadState !== 'done' ? (
                <div className="flex flex-col items-center justify-center h-full animate-pulse space-y-6">
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
                <div className="flex flex-col h-full max-w-6xl mx-auto w-full space-y-4 animate-in fade-in zoom-in duration-500 justify-center">

                    {/* Header */}
                    <div className="text-center shrink-0">
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
                            <div className="flex flex-col h-full bg-gray-100/50 rounded-3xl border-2 border-dashed border-gray-200 p-10 items-center justify-center relative">
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
                            <div className="flex flex-col h-full bg-gray-100/50 rounded-3xl border-2 border-dashed border-gray-200 p-10 items-center justify-center relative">
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
            }
        </div >
    );
};
