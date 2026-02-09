import { useEffect, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { useBooth } from '@/context/BoothContext';
import { useUploadSessionMedia } from '@/api/endpoints/sessions/sessions';
import { getLayoutConfig, DEFAULT_OVERLAY_CONFIG } from '@/app/config/layouts';
import { useStripComposer } from '@/hooks/useStripComposer';

export const CompletedLayout = () => {
    const {
        rawPhotos, selectedPhotoIndices, selectedFrameId, selectedFilter, customMessage,
        sessionId, resetSession, isProcessing, setProcessing
    } = useBooth();

    const [finalUrl, setFinalUrl] = useState<string | null>(null);
    const [uploadState, setUploadState] = useState<'idle' | 'processing' | 'uploading' | 'done'>('processing');
    const { mutate: uploadMedia } = useUploadSessionMedia();

    // Generate accurate strip using the hook
    const { blob: stripBlob, previewUrl, isThinking } = useStripComposer({
        uniqueId: 'completed-final',
        rawPhotos,
        selectedPhotoIndices,
        selectedFrameId,
        selectedFilter,
        customMessage,
        enabled: uploadState === 'processing'
    });

    useEffect(() => {
        let isMounted = true;

        const performUpload = async () => {
            if (isThinking || !stripBlob) return;

            // Ensure we have a valid session ID from backend
            if (!sessionId || sessionId.startsWith('local-')) {
                console.error("Invalid Session ID for upload:", sessionId);
                // Fallback for local/invalid sessions
                setFinalUrl(previewUrl);
                setUploadState('done');
                setProcessing(false);
                return;
            }

            setFinalUrl(previewUrl);
            setUploadState('uploading');

            const file = new File([stripBlob], 'photo.jpg', { type: 'image/jpeg' });

            uploadMedia({
                id: sessionId,
                data: { file: file },
                params: { type: 'ORIGINAL' }
            }, {
                onSuccess: (resp) => {
                    console.log("Upload success:", resp);
                    if (isMounted) setUploadState('done');
                    setProcessing(false);
                },
                onError: (err) => {
                    console.error("Upload failed", err);
                    if (isMounted) setUploadState('done');
                    setProcessing(false);
                }
            });
        };

        if (uploadState === 'processing' && !isThinking && stripBlob) {
            performUpload();
        }

        return () => { isMounted = false; };
    }, [uploadState, isThinking, stripBlob, sessionId, uploadMedia, previewUrl, setProcessing]);

    // QR Code URL
    const shareUrl = (typeof window !== 'undefined' && sessionId && !sessionId.startsWith('local-'))
        ? `${window.location.origin}/share/${sessionId}`
        : '';

    return (
        <div className="flex flex-col h-full items-center justify-center bg-gray-50 p-8 text-center space-y-8">
            {uploadState !== 'done' ? (
                <div className="flex flex-col items-center animate-pulse">
                    <Loader2 className="w-16 h-16 text-black animate-spin mb-4" />
                    <h2 className="text-2xl font-bold text-gray-700">Đang xử lý ảnh tuyệt đẹp của bạn...</h2>
                    {isThinking && <p className="text-gray-400 text-sm mt-2">Đang ghép ảnh...</p>}
                    {uploadState === 'uploading' && <p className="text-gray-400 text-sm mt-2">Đang tải lên...</p>}
                </div>
            ) : (
                <div className="animate-in zoom-in duration-500 flex flex-col items-center max-h-full overflow-y-auto">
                    <div className="mb-6 shrink-0">
                        <div className="bg-green-100 text-green-700 p-4 rounded-full inline-block mb-4">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h1 className="text-4xl font-extrabold mb-2">Hoàn Tất!</h1>
                        <p className="text-muted-foreground text-lg">Quét mã QR để tải ảnh ngay</p>
                    </div>

                    {shareUrl ? (
                        <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 mb-8 shrink-0">
                            <QRCode
                                value={shareUrl}
                                size={200}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox={`0 0 256 256`}
                            />
                        </div>
                    ) : (
                        <div className="p-4 bg-yellow-50 text-yellow-600 rounded-xl mb-8">
                            Không thể tạo mã QR (Lỗi kết nối)
                        </div>
                    )}

                    {finalUrl && (
                        <div className="mb-8 w-48 shadow-lg rotate-2 decoration-clone border-4 border-white shrink-0">
                            <img src={finalUrl} className="w-full h-auto" />
                        </div>
                    )}

                    <Button onClick={resetSession} variant="outline" size="lg" className="h-16 text-xl px-10 border-2 rounded-2xl hover:bg-gray-100 shrink-0">
                        <RefreshCcw className="mr-3 w-6 h-6" />
                        Chụp Lượt Mới
                    </Button>
                </div>
            )}
        </div>
    );
};
