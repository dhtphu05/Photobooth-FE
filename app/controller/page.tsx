'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';

import { useCreateSession } from '@/api/endpoints/sessions/sessions';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BoothProvider, useBooth } from '@/context/BoothContext';

const ControllerContent = () => {
    const { sessionId, setSessionId } = useBooth();
    const [filter, setFilter] = useState('original');
    const [frame, setFrame] = useState('none');
    const [origin, setOrigin] = useState('');
    const [controllerPhase, setControllerPhase] = useState<'IDLE' | 'RUNNING' | 'PROCESSING' | 'COMPLETED'>('IDLE');
    const [currentShot, setCurrentShot] = useState(0);
    const [resultUrls, setResultUrls] = useState<{ imageUrl?: string; videoUrl?: string } | null>(null);
    const totalShots = 4;
    const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const { mutate: createSession, isPending: isCreating } = useCreateSession();

    const handleStartSession = () => {
        createSession({ data: {} as any }, {
            onSuccess: (response) => {
                const newSessionId = response.data.id;
                if (newSessionId) {
                    setSessionId(newSessionId);
                    socket.connect();
                    socket.emit('join', newSessionId);
                    setControllerPhase('IDLE');
                    setCurrentShot(0);
                    setResultUrls(null);
                }
            },
            onError: (error) => {
                console.error('Failed to create session', error);
            }
        });
    };

    const handleUpdateConfig = (newFilter: string, newFrame: string) => {
        setFilter(newFilter);
        setFrame(newFrame);
        if (sessionId) {
            socket.emit('update_state', { selectedFilter: newFilter, selectedFrame: newFrame });
        }
    };

    const requestCountdown = useCallback(() => {
        if (sessionId) {
            socket.emit('trigger_countdown', sessionId);
        }
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) return;

        const handleCaptureDone = (payload: { roomId?: string; shotIndex?: number }) => {
            if (payload.roomId && payload.roomId !== sessionId) return;
            if (typeof payload.shotIndex !== 'number') return;

            const completedShots = payload.shotIndex + 1;
            setCurrentShot(completedShots);

            if (countdownTimeoutRef.current) {
                clearTimeout(countdownTimeoutRef.current);
            }

            if (completedShots >= totalShots) {
                setControllerPhase('PROCESSING');
                // Monitor handles the loop logic now
            }
        };

        const handleShowResult = (payload: { roomId?: string; imageUrl?: string; videoUrl?: string; previewReady?: boolean }) => {
            if (payload.roomId && payload.roomId !== sessionId) return;
            if (payload.previewReady) {
                setControllerPhase('COMPLETED');
            }
            if (payload.imageUrl) {
                setResultUrls({ imageUrl: payload.imageUrl, videoUrl: payload.videoUrl });
                setControllerPhase('COMPLETED');
            }
        };

        socket.on('capture_done', handleCaptureDone);
        socket.on('show_result', handleShowResult);

        return () => {
            socket.off('capture_done', handleCaptureDone);
            socket.off('show_result', handleShowResult);
            if (countdownTimeoutRef.current) {
                clearTimeout(countdownTimeoutRef.current);
            }
        };
    }, [sessionId, totalShots, requestCountdown]);

    const handleStartFlow = () => {
        if (!sessionId) return;
        setControllerPhase('RUNNING');
        setCurrentShot(0);
        setResultUrls(null);
        requestCountdown();
    };

    const handleNewSession = () => {
        if (countdownTimeoutRef.current) {
            clearTimeout(countdownTimeoutRef.current);
        }
        socket.disconnect();
        setSessionId(null);
        setControllerPhase('IDLE');
        setCurrentShot(0);
        setResultUrls(null);
    };

    const openMonitor = () => {
        if (sessionId && origin) {
            window.open(`${origin}/monitor?sessionId=${sessionId}`, '_blank');
        }
    };

    const renderStatus = () => {
        switch (controllerPhase) {
            case 'RUNNING':
                return `Capturing shot ${Math.min(currentShot + 1, totalShots)}/${totalShots}`;
            case 'PROCESSING':
                return 'Processing & uploading...';
            case 'COMPLETED':
                return resultUrls?.imageUrl
                    ? 'Session completed! QR ready to share.'
                    : 'Success! Uploading to the cloud in background...';
            default:
                return 'Ready to start the session';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">Photobooth Controller</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!sessionId ? (
                        <div className="text-center space-y-4">
                            <p className="text-muted-foreground">Start a new session to begin</p>
                            <Button onClick={handleStartSession} disabled={isCreating} className="w-full">
                                {isCreating ? 'Creating...' : 'Start Session'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-muted p-3 rounded-lg text-center flex flex-col justify-center items-center gap-2">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session ID</p>
                                    <p className="font-mono text-sm truncate">{sessionId}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={openMonitor} className="w-full">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open Monitor
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Filter</label>
                                <Select value={filter} onValueChange={(val) => handleUpdateConfig(val, frame)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="original">Original</SelectItem>
                                        <SelectItem value="bw">Black & White</SelectItem>
                                        <SelectItem value="sepia">Sepia</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Frame</label>
                                <Select value={frame} onValueChange={(val) => handleUpdateConfig(filter, val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">Default</SelectItem>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="holiday">Holiday</SelectItem>
                                        <SelectItem value="summer">Summer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 text-center">
                                <p className="text-sm font-semibold">{renderStatus()}</p>
                                {controllerPhase === 'PROCESSING' && (
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Monitor is finishing up...</span>
                                    </div>
                                )}
                                {controllerPhase === 'COMPLETED' && resultUrls?.imageUrl && (
                                    <Button variant="outline" asChild>
                                        <a href={resultUrls.imageUrl} target="_blank" rel="noreferrer">View Final Strip</a>
                                    </Button>
                                )}

                                {controllerPhase === 'COMPLETED' && !resultUrls?.imageUrl && (
                                    <p className="text-xs text-muted-foreground">Uploads still running... QR will appear soon.</p>
                                )}
                            </div>

                            <Button
                                onClick={handleStartFlow}
                                className="w-full py-8 text-lg font-bold"
                                variant="default"
                                disabled={controllerPhase === 'RUNNING' || controllerPhase === 'PROCESSING'}
                            >
                                {controllerPhase === 'RUNNING' ? 'Capturing...' : 'Start Photobooth'}
                            </Button>

                            {controllerPhase === 'COMPLETED' && (
                                <Button variant="outline" className="w-full" onClick={handleNewSession}>
                                    New Session
                                </Button>
                            )}

                            <div className="pt-4 border-t text-center space-y-2">
                                <p className="text-xs text-muted-foreground">Scan to Share:</p>
                                <div className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
                                    {origin}/share/{sessionId}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default function ControllerPage() {
    return (
        <BoothProvider>
            <ControllerContent />
        </BoothProvider>
    );
}
