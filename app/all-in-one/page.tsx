'use client';

import { useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { BoothProvider, useBooth } from '@/context/BoothContext';
import { useVideoComposer } from '@/hooks/useVideoComposer';
import { useUploadSessionMedia } from '@/api/endpoints/sessions/sessions';

// Import extracted components
import { FrameSelectionLayout } from '@/components/photobooth/all-in-one/FrameSelectionLayout';
import { CaptureLayout } from '@/components/photobooth/all-in-one/CaptureLayout'; // Functions as Config + Capture
import { SelectionLayout } from '@/components/photobooth/all-in-one/SelectionLayout';
import { ReviewLayout } from '@/components/photobooth/all-in-one/ReviewLayout';
import { CompletedLayout } from '@/components/photobooth/all-in-one/CompletedLayout';

// Helper to mirror a blob (image)
const mirrorImageBlob = async (originalBlob: Blob): Promise<Blob> => {
    if (typeof window === 'undefined') return originalBlob;
    try {
        const bitmap = await createImageBitmap(originalBlob);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return originalBlob;

        // Flip horizontally
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(bitmap, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((b) => {
                resolve(b || originalBlob);
            }, originalBlob.type || 'image/jpeg', 0.95);
        });
    } catch (e) {
        console.error("Failed to mirror image", e);
        return originalBlob;
    }
};

const AllInOneContent = () => {
    const { 
        sessionId,
        step,
        rawPhotos,
        rawVideoClips,
        selectedPhotoIndices,
        selectedFrameId,
        signatureData,
        customMessage
    } = useBooth();
    
    // We keep ref here to maintain it if needed, or we can move it inside CaptureLayout if it fully owns it.
    // However, if we want to support transition out of CaptureLayout (e.g. to Selection) and back?
    // Actually, Selection step doesn't use camera normally. 
    // So keeping ref here is fine, but CaptureLayout will render the Webcam.
    const webcamRef = useRef<Webcam>(null);

    // Background job: Generate video recap early when entering the message step
    const { videoBlob, videoUrl, status: videoStatus } = useVideoComposer({
        uniqueId: `global-video-${selectedFrameId}`,
        rawVideoClips,
        selectedPhotoIndices,
        selectedFrameId,
        signatureData,
        customMessage,
        enabled: step === 'REVIEW' || step === 'COMPLETED'
    });

    const { mutateAsync: uploadMedia } = useUploadSessionMedia();

    // Track background upload promises
    const backgroundUploadsRef = useRef<Promise<any>[]>([]);
    
    // Track what has been initiated
    const uploadedOriginalsRef = useRef<Set<number>>(new Set());
    const uploadedVideoRef = useRef(false);
    const uploadedSignatureRef = useRef(false);

    // Reset refs on new session
    const currentSessionRef = useRef(sessionId);
    if (sessionId !== currentSessionRef.current) {
         uploadedOriginalsRef.current.clear();
         uploadedVideoRef.current = false;
         uploadedSignatureRef.current = false;
         backgroundUploadsRef.current = [];
         currentSessionRef.current = sessionId;
    }

    // Background upload logic
    // 1. All raw photos (6 photos instead of selected)
    useEffect(() => {
        if (!sessionId || sessionId.startsWith('local-')) return;
        if (step !== 'SELECTION' && step !== 'REVIEW' && step !== 'COMPLETED') return;

        rawPhotos.forEach((blob, index) => {
            if (blob && !uploadedOriginalsRef.current.has(index)) {
                uploadedOriginalsRef.current.add(index);
                const p = mirrorImageBlob(blob).then(mirrored => {
                    const file = new File([mirrored], `original-${index}.jpg`, { type: 'image/jpeg' });
                    return uploadMedia({ id: sessionId, data: { file }, params: { type: 'ORIGINAL' } });
                });
                backgroundUploadsRef.current.push(p);
            }
        });
    }, [rawPhotos, sessionId, step, uploadMedia]);

    // 2. Upload Video
    useEffect(() => {
        if (!sessionId || sessionId.startsWith('local-')) return;
        if (videoStatus === 'success' && videoBlob && !uploadedVideoRef.current) {
            uploadedVideoRef.current = true;
            const file = new File([videoBlob], 'videorecap.webm', { type: 'video/webm' });
            const p = uploadMedia({ id: sessionId, data: { file }, params: { type: 'VIDEO' } });
            backgroundUploadsRef.current.push(p);
        }
    }, [videoBlob, videoStatus, sessionId, uploadMedia]);

    // 3. Upload Signature
    useEffect(() => {
        if (!sessionId || sessionId.startsWith('local-')) return;
        if (signatureData && !uploadedSignatureRef.current) {
            uploadedSignatureRef.current = true;
            const p = fetch(signatureData).then(r => r.blob()).then(blob => {
                 const file = new File([blob], 'signature.png', { type: 'image/png' });
                 return uploadMedia({ id: sessionId, data: { file }, params: { type: 'SIGNATURE' as any } });
            });
            backgroundUploadsRef.current.push(p);
        }
    }, [signatureData, sessionId, uploadMedia]);

    // Step Router
    const renderStep = () => {
        switch (step) {
            case 'FRAME_SELECTION':
                return <FrameSelectionLayout />;

            // BOTH Config (Timer) and Capture steps use the Unified CaptureLayout
            case 'CONFIG':
            case 'CAPTURE':
                return <CaptureLayout webcamRef={webcamRef} />;

            case 'SELECTION':
                return <SelectionLayout />;
            case 'REVIEW':
                return <ReviewLayout />;
            case 'COMPLETED':
                return <CompletedLayout videoBlob={videoBlob} videoUrl={videoUrl} videoStatus={videoStatus} backgroundUploadsRef={backgroundUploadsRef} />;
            default:
                return <FrameSelectionLayout />;
        }
    };

    return (
        <div className="w-full h-screen overflow-hidden text-gray-900 bg-white font-sans">
            {renderStep()}
        </div>
    );
};

export default function AllInOnePage() {
    return (
        <BoothProvider mode="local">
            <AllInOneContent />
        </BoothProvider>
    );
}
