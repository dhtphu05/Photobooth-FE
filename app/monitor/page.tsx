'use client';

import { useEffect, useState, useRef } from 'react';
import { socket } from '@/lib/socket';
import { useUploadSessionMedia } from '@/api/endpoints/sessions/sessions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MonitorPage() {
    const [sessionId, setSessionId] = useState('');
    const sessionIdRef = useRef('');
    const [joined, setJoined] = useState(false);
    const [state, setState] = useState({ filter: 'original', frame: 'none' });
    const [view, setView] = useState<'IDLE' | 'COUNTDOWN' | 'RESULT'>('IDLE');
    const [countdown, setCountdown] = useState(3);
    const [resultUrl, setResultUrl] = useState<string | null>(null);

    const { mutate: uploadMedia } = useUploadSessionMedia();

    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    const simulateCaptureAndUpload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'black';
            ctx.font = '48px serif';
            ctx.fillText(`Session: ${sessionIdRef.current}`, 50, 100);
            ctx.fillText('Simulated Capture', 50, 200);

            canvas.toBlob((blob) => {
                if (blob && sessionIdRef.current) {
                    uploadMedia({
                        id: sessionIdRef.current,
                        data: { file: blob as any },
                        params: { type: 'ORIGINAL' }
                    });
                }
            }, 'image/jpeg');
        }
    };

    useEffect(() => {
        socket.on('state_updated', (payload) => {
            setState(prev => ({ ...prev, ...payload }));
        });

        socket.on('start_countdown', () => {
            setView('COUNTDOWN');
            setCountdown(3);
            let count = 3;
            const int = setInterval(() => {
                count--;
                setCountdown(count);
                if (count <= 0) {
                    clearInterval(int);
                    simulateCaptureAndUpload();
                }
            }, 1000);
        });

        socket.on('show_result', (payload) => {
            setResultUrl(payload.imageUrl);
            setView('RESULT');
        });

        return () => {
            socket.off('state_updated');
            socket.off('start_countdown');
            socket.off('show_result');
        }
    }, []);

    const handleJoin = () => {
        if (sessionId) {
            socket.connect();
            socket.emit('join', sessionId);
            setJoined(true);
        }
    }

    const getFilterStyle = () => {
        switch (state.filter) {
            case 'bw': return { filter: 'grayscale(100%)' };
            case 'sepia': return { filter: 'sepia(100%)' };
            default: return {};
        }
    }

    const getFrameBorder = () => {
        switch (state.frame) {
            case 'holiday': return '20px solid #ef4444'; // red-500
            case 'summer': return '20px solid #eab308'; // yellow-500
            default: return 'none';
        }
    }

    if (!joined) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white space-y-4">
                <h1 className="text-2xl font-bold">Monitor Display</h1>
                <div className="flex space-x-2">
                    <Input
                        value={sessionId}
                        onChange={e => setSessionId(e.target.value)}
                        placeholder="Enter Session ID"
                        className="w-64 text-black"
                    />
                    <Button onClick={handleJoin} variant="secondary">Join</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen w-full flex items-center justify-center bg-black overflow-hidden relative transition-all duration-300">

            {/* Content Layer */}
            <div className="relative w-full h-full flex items-center justify-center transition-all duration-500" style={getFilterStyle()}>
                {view === 'IDLE' && (
                    <div className="text-center space-y-4 animate-bounce">
                        <h1 className="text-white text-6xl font-bold tracking-tighter">Ready?</h1>
                        <p className="text-white/80 text-2xl">Look at the camera!</p>
                    </div>
                )}

                {view === 'COUNTDOWN' && (
                    <div className="text-white text-[12rem] font-bold animate-ping">
                        {countdown > 0 ? countdown : 'CHEESE!'}
                    </div>
                )}

                {view === 'RESULT' && resultUrl && (
                    <img src={resultUrl} alt="Result" className="w-full h-full object-contain" />
                )}
            </div>

            {/* Frame Layer (Overlay) */}
            <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{ border: getFrameBorder() }}
            />

        </div>
    );
}
