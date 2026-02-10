import { useEffect, useState, useRef } from 'react';
import { Loader2, RefreshCcw, Download } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBooth } from '@/context/BoothContext';
// Import the direct API function for Promise.all usage, OR use the hook's mutateAsync
import { useUploadSessionMedia } from '@/api/endpoints/sessions/sessions';
import { useStripComposer } from '@/hooks/useStripComposer';
import { useVideoComposer } from '@/hooks/useVideoComposer';

export const CompletedLayout = () => {
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

    // 2. Generate Video Recap
    const { videoBlob, videoUrl, isGenerating: isVideoGenerating } = useVideoComposer({
        uniqueId: 'completed-video',
        rawVideoClips,
        selectedPhotoIndices,
        selectedFrameId,
        signatureData,
        enabled: true
    });

    // Master Upload Logic
    useEffect(() => {
        // 1. Wait for ALL generation to finish
        if (isStripGenerating || isVideoGenerating) {
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
            const totalUploads =
                (stripBlob ? 1 : 0) +
                (videoBlob ? 1 : 0) +
                selectedPhotoIndices.length +
                (signatureData ? 1 : 0);

            let completedCount = 0;
            const updateProgress = () => {
                completedCount++;
                setProgress(Math.round((completedCount / totalUploads) * 100));
            };

            const uploadPromises: Promise<any>[] = [];

            try {
                // A. Upload Processed Strip
                if (stripBlob) {
                    const file = new File([stripBlob], 'photostrip.jpg', { type: 'image/jpeg' });
                    uploadPromises.push(
                        uploadMedia({
                            id: sessionId,
                            data: { file },
                            params: { type: 'PROCESSED' }
                        }).then(updateProgress)
                    );
                }

                // B. Upload Video Recap
                if (videoBlob) {
                    const file = new File([videoBlob], 'videorecap.webm', { type: 'video/webm' });
                    uploadPromises.push(
                        uploadMedia({
                            id: sessionId,
                            data: { file },
                            params: { type: 'VIDEO' }
                        }).then(updateProgress)
                    );
                }

                // C. Upload Selected Originals (IMPORTANT for Share Page)
                selectedPhotoIndices.forEach((index) => {
                    const blob = rawPhotos[index];
                    if (blob) {
                        // Keep original filename if possible, or generic
                        const file = new File([blob], `original-${index}.jpg`, { type: 'image/jpeg' });
                        uploadPromises.push(
                            uploadMedia({
                                id: sessionId,
                                data: { file },
                                params: { type: 'ORIGINAL' }
                            }).then(updateProgress)
                        );
                    }
                });

                // D. Upload Signature (Optional but good for completeness)
                if (signatureData) {
                    // Convert base64 to blob
                    const fetchSig = async () => {
                        try {
                            const res = await fetch(signatureData);
                            const blob = await res.blob();
                            const file = new File([blob], 'signature.png', { type: 'image/png' });
                            await uploadMedia({
                                id: sessionId,
                                data: { file },
                                params: { type: 'SIGNATURE' as any } // Type might need casting if strict enum
                            });
                        } catch (e) {
                            console.warn("Signature upload failed", e);
                        } finally {
                            updateProgress();
                        }
                    };
                    uploadPromises.push(fetchSig());
                }

                await Promise.all(uploadPromises);
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
        isStripGenerating, isVideoGenerating,
        stripBlob, videoBlob,
        sessionId, uploadState,
        selectedPhotoIndices, rawPhotos, signatureData,
        uploadMedia, setProcessing
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
                        <p>{isVideoGenerating ? "Rendering video recap..." : "Video recap ready ✅"}</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full max-w-7xl mx-auto w-full space-y-6 animate-in fade-in zoom-in duration-500">

                    {/* Header */}
                    <div className="text-center shrink-0">
                        <div className="bg-green-100 text-green-700 p-3 rounded-full inline-block mb-2">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900">Hoàn Tất!</h1>
                        <p className="text-muted-foreground">Quét mã QR bên dưới để tải hình & video</p>
                    </div>

                    {/* Main Grid: Strip vs Video */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 grow overflow-hidden min-h-0">
                        {/* PHOTO STRIP */}
                        <Card className="flex flex-col h-full border-2 shadow-sm">
                            <CardHeader className="text-center py-4">
                                <CardTitle>Photo Strip</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col items-center justify-center bg-gray-100/50 p-4 min-h-0">
                                {stripUrl ? (
                                    <div className="relative h-full w-full flex items-center justify-center">
                                        <img
                                            src={stripUrl}
                                            alt="Result"
                                            className="max-h-full max-w-full object-contain shadow-lg rounded-sm"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-gray-400">Không có ảnh</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* VIDEO RECAP */}
                        <Card className="flex flex-col h-full border-2 shadow-sm">
                            <CardHeader className="text-center py-4">
                                <CardTitle>Video Recap</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col items-center justify-center bg-gray-100/50 p-4 min-h-0">
                                {videoUrl ? (
                                    <div className="relative h-full w-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
                                        <video
                                            src={videoUrl}
                                            autoPlay
                                            muted
                                            loop
                                            playsInline
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-gray-400">Không có video</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Footer: QR & New Session */}
                    <div className="shrink-0 bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">

                        {/* QR Section */}
                        <div className="flex items-center gap-6">
                            <div className="bg-white p-2 rounded-lg shadow-inner border shrink-0">
                                {shareUrl ? (
                                    <QRCode
                                        value={shareUrl}
                                        size={100}
                                        style={{ height: "auto", maxWidth: "100%", width: "100px" }}
                                        viewBox={`0 0 256 256`}
                                    />
                                ) : (
                                    <div className="w-[100px] h-[100px] bg-gray-100 flex items-center justify-center text-xs text-gray-400 text-center">
                                        Offline Mode
                                    </div>
                                )}
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-lg">Tải Ảnh Ngay</h3>
                                <p className="text-sm text-muted-foreground w-48">Mở camera điện thoại và quét mã QR để lưu ảnh.</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <Button onClick={resetSession} size="lg" className="h-14 text-lg px-8 rounded-xl shadow-md hover:shadow-lg transition-all">
                                <RefreshCcw className="mr-2 w-5 h-5" />
                                Chụp Lượt Mới
                            </Button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};
