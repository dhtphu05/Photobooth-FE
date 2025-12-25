'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Webcam from 'react-webcam';
import { Loader2 } from 'lucide-react';

import { socket } from '@/lib/socket';
import { BoothProvider, useBooth } from '@/context/BoothContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QRCodeResult } from '@/components/QRCodeResult';

const MonitorContent = () => {
    const searchParams = useSearchParams();
    const {
        sessionId,
        setSessionId,
        sessionPhase,
        setSessionPhase,
        currentShotIndex,
        totalShots,
        startSessionLoop,
        registerShotResult,
        handleFinishSession,
        localPreviewUrl,
        cloudDownloadUrl,
    } = useBooth();

    const sessionIdRef = useRef<string | null>(null);
    const [joined, setJoined] = useState(false);
    const [state, setState] = useState({ filter: 'original', frame: 'none' });
    const [countdown, setCountdown] = useState<number | null>(null);
    const [flash, setFlash] = useState(false);
    const [nextShotMessage, setNextShotMessage] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [previews, setPreviews] = useState<(string | null)[]>(Array(totalShots).fill(null));
    const [origin, setOrigin] = useState('');

    const webcamRef = useRef<Webcam>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const clipPromiseRef = useRef<Promise<Blob> | null>(null);
    const clipResolverRef = useRef<((blob: Blob) => void) | null>(null);
    const hasTriggeredUploadRef = useRef(false);

    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    useEffect(() => {
        setOrigin(typeof window !== 'undefined' ? window.location.origin : '');
    }, []);

    const handleJoin = useCallback((id: string = sessionId ?? '') => {
        if (!id) return;
        socket.connect();
        socket.emit('join', id);
        setJoined(true);
        setSessionId(id);
        setSessionPhase('IDLE');
    }, [sessionId, setSessionId, setSessionPhase]);

    useEffect(() => {
        const queryId = searchParams.get('sessionId');
        if (queryId) {
            setSessionId(queryId);
            if (!joined) {
                setTimeout(() => {
                    handleJoin(queryId);
                }, 300);
            }
        }
    }, [searchParams, joined, handleJoin, setSessionId]);

    const startRecording = useCallback(() => {
        const stream = webcamRef.current?.stream;
        if (!stream) return;

        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorderRef.current = recorder;
        recordedChunksRef.current = [];

        clipPromiseRef.current = new Promise(resolve => {
            clipResolverRef.current = resolve;
        });

        recorder.ondataavailable = event => {
            if (event.data.size > 0) recordedChunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
            const clipBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            clipResolverRef.current?.(clipBlob);
            clipResolverRef.current = null;
        };

        recorder.start();
    }, []);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        const recorder = mediaRecorderRef.current;
        const clipPromise = clipPromiseRef.current;

        if (!recorder || !clipPromise) {
            return null;
        }

        if (recorder.state !== 'inactive') {
            recorder.stop();
        }

        mediaRecorderRef.current = null;
        const clipBlob = await clipPromise;
        clipPromiseRef.current = null;
        return clipBlob;
    }, []);

    const captureShot = useCallback(async () => {
        if (!webcamRef.current || !sessionIdRef.current) return;

        const shotIndex = Math.min(currentShotIndex, totalShots - 1);
        setSessionPhase('CAPTURING');
        setFlash(true);

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            setFlash(false);
            return;
        }

        const photoBlob = await fetch(imageSrc).then(res => res.blob());
        const clipBlob = await stopRecording();

        try {
            await registerShotResult(photoBlob, { clip: clipBlob ?? undefined });
        } catch (error) {
            console.error('Error processing shot:', error);
            // Optional: visual feedback to user
        }

        setPreviews(prev => {
            const next = [...prev];
            next[shotIndex] = imageSrc;
            return next;
        });

        socket.emit('capture_done', { roomId: sessionIdRef.current, shotIndex });

        setTimeout(() => setFlash(false), 180);
        setNextShotMessage(shotIndex + 1 >= totalShots ? null : 'Next shot in 2s');
    }, [currentShotIndex, totalShots, registerShotResult, stopRecording, setSessionPhase]);

    const runCountdown = useCallback(() => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
        }

        setSessionPhase('COUNTDOWN');
        setCountdown(3);
        startRecording();

        let remaining = 3;
        countdownTimerRef.current = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                if (countdownTimerRef.current) {
                    clearInterval(countdownTimerRef.current);
                }
                setCountdown(null);
                captureShot();
            } else {
                setCountdown(remaining);
            }
        }, 1000);
    }, [captureShot, startRecording, setSessionPhase]);

    useEffect(() => {
        socket.on('state_updated', payload => {
            setState(prev => ({ ...prev, ...payload }));
        });

        socket.on('start_countdown', () => {
            setNextShotMessage(null);
            if (currentShotIndex === 0 && sessionPhase === 'IDLE') {
                hasTriggeredUploadRef.current = false;
                setPreviews(Array(totalShots).fill(null));
                startSessionLoop();
            }
            runCountdown();
        });

        socket.on('show_result', payload => {
            if (payload.roomId && sessionIdRef.current && payload.roomId !== sessionIdRef.current) return;
            if (payload.imageUrl) {
                setSessionPhase('COMPLETED');
            }
        });

        return () => {
            socket.off('state_updated');
            socket.off('start_countdown');
            socket.off('show_result');
        };
    }, [currentShotIndex, sessionPhase, totalShots, startSessionLoop, runCountdown, setSessionPhase]);

    useEffect(() => {
        if (sessionPhase === 'READY' && !hasTriggeredUploadRef.current) {
            hasTriggeredUploadRef.current = true;
            setUploadError(null);
            handleFinishSession().catch(err => {
                console.error('Bulk upload failed', err);
                setUploadError('Upload failed. Tap to retry.');
                hasTriggeredUploadRef.current = false;
            });
        }
    }, [sessionPhase, handleFinishSession]);

    // Loop trigger
    useEffect(() => {
        if (sessionPhase === 'DELAY') {
            const timer = setTimeout(() => {
                runCountdown();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [sessionPhase, runCountdown]);

    useEffect(() => {
        return () => {
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);



    const retryUpload = () => {
        setUploadError(null);
        handleFinishSession().catch(err => {
            console.error('Retry upload failed', err);
            setUploadError('Upload failed. Tap to retry.');
        });
    };

    const getFilterStyle = () => {
        switch (state.filter) {
            case 'bw': return { filter: 'grayscale(100%)' };
            case 'sepia': return { filter: 'sepia(100%)' };
            default: return {};
        }
    };

    const getFrameBorder = () => {
        switch (state.frame) {
            case 'holiday': return '20px solid #ef4444';
            case 'summer': return '20px solid #eab308';
            default: return 'none';
        }
    };

    if (!joined) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white space-y-4">
                <h1 className="text-2xl font-bold">Monitor Display</h1>
                <div className="flex space-x-2">
                    <Input
                        value={sessionId ?? ''}
                        onChange={e => setSessionId(e.target.value)}
                        placeholder="Enter Session ID"
                        className="w-64 text-black"
                    />
                    <Button onClick={() => handleJoin()} variant="secondary">Join</Button>
                </div>
            </div>
        );
    }

    const shotsCompleted = Math.min(currentShotIndex, totalShots);
    const shareUrl = sessionId && origin ? `${origin}/share/${sessionId}` : undefined;
    const qrUrl = cloudDownloadUrl && shareUrl ? shareUrl : undefined;

    if (sessionPhase === 'COMPLETED' && localPreviewUrl) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black text-white">
                <div className="flex w-full h-full p-8 gap-8 items-center justify-center bg-black">
                    <div className="flex-1 h-full flex justify-center relative">
                        <img src={localPreviewUrl} alt="Final Result" className="h-full object-contain rounded-xl shadow-2xl" />
                        <div className="absolute inset-0 pointer-events-none" style={{ border: getFrameBorder() }} />
                    </div>
                    <div className="w-[400px] flex flex-col items-center justify-center bg-white/10 p-8 rounded-2xl backdrop-blur-md">
                        <QRCodeResult
                            url={qrUrl}
                            isLoading={!cloudDownloadUrl && !uploadError}
                            errorMessage={uploadError}
                            onRetry={uploadError ? retryUpload : undefined}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex items-center justify-center bg-black overflow-hidden relative">
            <div className="absolute top-8 left-8 z-30 bg-white/10 backdrop-blur rounded-2xl px-6 py-3 text-white">
                <p className="text-sm uppercase tracking-widest text-white/70">Session</p>
                <p className="font-mono">{sessionId}</p>
                <p className="mt-2 font-semibold">Shot {Math.min(currentShotIndex + 1, totalShots)}/{totalShots}</p>
                <p className="text-sm text-white/70">Completed {shotsCompleted}/{totalShots}</p>
            </div>

            <div className="absolute top-8 right-8 z-30 flex gap-2">
                {previews.map((preview, index) => (
                    <div
                        key={index}
                        className={`w-16 h-24 rounded-lg overflow-hidden border ${index < shotsCompleted ? 'border-green-400' : 'border-white/20'}`}
                    >
                        {preview ? (
                            <img src={preview} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
                                {index + 1}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="relative w-full h-full flex items-center justify-center" style={getFilterStyle()}>
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: 'user', width: 1920, height: 1080 }}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                />

                {sessionPhase === 'IDLE' && (
                    <div className="text-center space-y-4 animate-bounce z-20">
                        <h1 className="text-white text-6xl font-bold tracking-tighter">Ready?</h1>
                        <p className="text-white/80 text-2xl">Look at the camera!</p>
                    </div>
                )}

                {sessionPhase === 'COUNTDOWN' && countdown && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/20">
                        <div className="text-white text-[15rem] font-bold drop-shadow-lg">
                            {countdown}
                        </div>
                    </div>
                )}

                {flash && (
                    <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-300 pointer-events-none" />
                )}

                {sessionPhase === 'DELAY' && nextShotMessage && (
                    <div className="absolute inset-0 flex items-center justify-center z-30">
                        <p className="text-white text-4xl font-semibold bg-black/50 px-8 py-4 rounded-full">{nextShotMessage}</p>
                    </div>
                )}

                {sessionPhase === 'PROCESSING' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/70">
                        <Loader2 className="w-16 h-16 text-white animate-spin mb-4" />
                        <p className="text-white text-2xl font-semibold">Generating your strip...</p>
                    </div>
                )}
            </div>

            <div
                className="absolute inset-0 pointer-events-none z-10 box-border"
                style={{ border: getFrameBorder() }}
            />
        </div>
    );
};

export default function MonitorPage() {
    return (
        <BoothProvider>
            <MonitorContent />
        </BoothProvider>
    );
}
