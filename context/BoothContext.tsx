'use client';

import React, {
    createContext,
    useContext,
    useState,
    useRef,
    useCallback,
    useMemo,
    ReactNode,
} from 'react';
import { uploadSessionMedia } from '@/api/endpoints/sessions/sessions';
import { UploadSessionMediaType } from '@/api/model';
import { socket } from '@/lib/socket';

const TOTAL_SHOTS = 4;

export type SessionPhase =
    | 'IDLE'
    | 'COUNTDOWN'
    | 'CAPTURING'
    | 'DELAY'
    | 'PROCESSING'
    | 'READY'
    | 'UPLOADING'
    | 'COMPLETED';

interface BoothContextType {
    sessionId: string | null;
    setSessionId: (id: string | null) => void;
    sessionPhase: SessionPhase;
    setSessionPhase: React.Dispatch<React.SetStateAction<SessionPhase>>;
    currentShotIndex: number;
    totalShots: number;
    tempPhotos: (Blob | null)[];
    tempVideoClips: (Blob | null)[];
    finalImageBlob: Blob | null;
    finalVideoBlob: Blob | null;
    finalImageUrl: string | null;
    finalVideoUrl: string | null;
    startSessionLoop: () => void;
    registerShotResult: (photo: Blob, options?: { clip?: Blob | null }) => Promise<void>;
    handleFinishSession: () => Promise<void>;
    resetSession: () => void;
}

const generateFrame = async (photos: Blob[]): Promise<Blob> => {
    // Basic implementation: Vertical Stack
    const bitmaps = await Promise.all(photos.map(p => createImageBitmap(p)));
    const width = bitmaps[0]?.width || 1920;
    const height = bitmaps.reduce((acc, b) => acc + b.height, 0);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');

    let y = 0;
    for (const bmp of bitmaps) {
        ctx.drawImage(bmp, 0, y);
        y += bmp.height;
    }

    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
};

const generateVideo = async (clips: Blob[]): Promise<Blob> => {
    // Full stitching requires ffmpeg.wasm or server-side. 
    // For now, return the first clip or a placeholder empty blob to prevent crash.
    // If multiple clips exist, we might just use the first one or create a dummy.
    if (clips.length > 0) {
        return clips[0];
    }
    return new Blob([], { type: 'video/webm' });
};

const BoothContext = createContext<BoothContextType | undefined>(undefined);

export const BoothProvider = ({ children }: { children: ReactNode }) => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionPhase, setSessionPhase] = useState<SessionPhase>('IDLE');
    const [currentShotIndex, setCurrentShotIndex] = useState(0);
    const [tempPhotos, setTempPhotos] = useState<(Blob | null)[]>(Array(TOTAL_SHOTS).fill(null));
    const [tempVideoClips, setTempVideoClips] = useState<(Blob | null)[]>(Array(TOTAL_SHOTS).fill(null));
    const [finalImageBlob, setFinalImageBlob] = useState<Blob | null>(null);
    const [finalVideoBlob, setFinalVideoBlob] = useState<Blob | null>(null);
    const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
    const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

    const photosRef = useRef<(Blob | null)[]>(tempPhotos);
    const clipsRef = useRef<(Blob | null)[]>(tempVideoClips);

    const resetLoopState = useCallback(() => {
        const emptyPhotos = Array(TOTAL_SHOTS).fill(null);
        const emptyClips = Array(TOTAL_SHOTS).fill(null);
        setCurrentShotIndex(0);
        setTempPhotos(emptyPhotos);
        photosRef.current = emptyPhotos;
        setTempVideoClips(emptyClips);
        clipsRef.current = emptyClips;
        setFinalImageBlob(null);
        setFinalVideoBlob(null);
        setFinalImageUrl(null);
        setFinalVideoUrl(null);
    }, []);

    const startSessionLoop = useCallback(() => {
        resetLoopState();
        setSessionPhase('COUNTDOWN');
    }, [resetLoopState]);

    const processShots = useCallback(async () => {
        setSessionPhase('PROCESSING');
        try {
            const photoInputs = photosRef.current.filter(Boolean) as Blob[];
            const clipInputs = clipsRef.current.filter(Boolean) as Blob[];

            const [mergedFrame, recapVideo] = await Promise.all([
                generateFrame(photoInputs),
                generateVideo(clipInputs),
            ]);

            setFinalImageBlob(mergedFrame);
            setFinalVideoBlob(recapVideo);
            setSessionPhase('READY');
        } catch (error) {
            console.error('Failed to process captured media', error);
            setSessionPhase('IDLE');
            throw error;
        }
    }, []);

    const registerShotResult = useCallback(
        async (photo: Blob, options?: { clip?: Blob | null }) => {
            setTempPhotos(prev => {
                const next = [...prev];
                next[currentShotIndex] = photo;
                photosRef.current = next;
                return next;
            });

            if (options?.clip) {
                setTempVideoClips(prev => {
                    const next = [...prev];
                    next[currentShotIndex] = options.clip ?? null;
                    clipsRef.current = next;
                    return next;
                });
            }

            const nextIndex = currentShotIndex + 1;
            if (nextIndex >= TOTAL_SHOTS) {
                setCurrentShotIndex(TOTAL_SHOTS);
                await processShots();
            } else {
                setCurrentShotIndex(nextIndex);
                setSessionPhase('DELAY');
            }
        },
        [currentShotIndex, processShots]
    );

    const handleFinishSession = useCallback(async () => {
        if (!sessionId || !finalImageBlob || !finalVideoBlob) {
            throw new Error('Cannot upload session without media outputs');
        }

        setSessionPhase('UPLOADING');

        const upload = (file: Blob, type: UploadSessionMediaType) =>
            uploadSessionMedia(sessionId, { file }, { type }).then(res => res.data.url);

        try {
            const [imageUrl, videoUrl] = await Promise.all([
                upload(finalImageBlob, UploadSessionMediaType.PROCESSED),
                upload(finalVideoBlob, UploadSessionMediaType.VIDEO),
            ]);

            setFinalImageUrl(imageUrl);
            setFinalVideoUrl(videoUrl);

            socket.emit('show_result', {
                roomId: sessionId,
                imageUrl,
                videoUrl,
            });

            setSessionPhase('COMPLETED');
        } catch (error) {
            console.error('Failed to upload processed media', error);
            setSessionPhase('READY');
            throw error;
        }
    }, [sessionId, finalImageBlob, finalVideoBlob]);

    const resetSession = useCallback(() => {
        setSessionId(null);
        resetLoopState();
        setSessionPhase('IDLE');
    }, [resetLoopState]);

    const value = useMemo<BoothContextType>(() => ({
        sessionId,
        setSessionId,
        sessionPhase,
        setSessionPhase,
        currentShotIndex,
        totalShots: TOTAL_SHOTS,
        tempPhotos,
        tempVideoClips,
        finalImageBlob,
        finalVideoBlob,
        finalImageUrl,
        finalVideoUrl,
        startSessionLoop,
        registerShotResult,
        handleFinishSession,
        resetSession,
    }), [
        sessionId,
        sessionPhase,
        currentShotIndex,
        tempPhotos,
        tempVideoClips,
        finalImageBlob,
        finalVideoBlob,
        finalImageUrl,
        finalVideoUrl,
        startSessionLoop,
        registerShotResult,
        handleFinishSession,
        resetSession,
    ]);

    return (
        <BoothContext.Provider value={value}>
            {children}
        </BoothContext.Provider>
    );
};

export const useBooth = () => {
    const context = useContext(BoothContext);
    if (!context) {
        throw new Error('useBooth must be used within a BoothProvider');
    }
    return context;
};
