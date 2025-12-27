'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Camera } from 'lucide-react';

import { useCreateSession } from '@/api/endpoints/sessions/sessions';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BoothProvider, useBooth } from '@/context/BoothContext';

const TIMER_OPTIONS = [5, 7, 10];
const FRAME_OPTIONS = [
  { id: 'frame-danang', label: 'Đà Nẵng', image: '/FRAME-ĐÀ-NẴNG.png' },
  { id: 'frame-bao-xuan', label: 'Báo Xuân', image: '/FRAME-BÁO-XUÂN.png' },
  { id: 'frame-chuyen-tau', label: 'Chuyển tàu', image: '/FRAME-CHUYẾN-TÀU-THANH-XUÂN.png' },
];
const FILTER_OPTIONS = [
  { id: 'normal', label: 'Original' },
  { id: 'bw', label: 'B&W' },
  { id: 'sepia', label: 'Sepia' },
];

const ControllerContent = () => {
  const {
    sessionId,
    setSessionId,
    step,
    setStep,
    timerDuration,
    setTimer,
    totalShots,
    requiredShots,
    capturedCount,
    photoPreviews,
    selectedPhotoIndices,
    isCapturePending,
    isProcessing,
    takeShot,
    receiveRemotePhoto,
    togglePhotoSelection,
    confirmSelection,
    setFrame,
    setFilter,
    setProcessing,
    resetSession,
    selectedFrameId,
    selectedFilter,
  } = useBooth();

  const { mutate: createSession, isPending: isCreating } = useCreateSession();
  const [origin, setOrigin] = useState('');
  const monitorWindow = useRef<Window | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleCreateSession = () => {
    const pendingWindow = window.open('', '_blank');
    monitorWindow.current = pendingWindow;
    createSession({ data: {} as any }, {
      onSuccess: response => {
        const id = response.data.id;
        if (id) {
          setSessionId(id);
          socket.connect();
          socket.emit('join', id);
          const targetUrl = `${window.location.origin}/monitor?sessionId=${id}`;
          if (monitorWindow.current) {
            monitorWindow.current.location.href = targetUrl;
          } else {
            window.open(targetUrl, '_blank');
          }
        }
      },
      onError: error => {
        console.error('Failed to create session', error);
        monitorWindow.current?.close();
        monitorWindow.current = null;
      },
    });
  };

  const seenRequestIdsRef = useRef(new Set<string>());

  useEffect(() => {
    seenRequestIdsRef.current.clear();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const handlePhotoTaken = (payload: { image: string; slot?: number; requestId?: string | null }) => {
      if (!payload?.image) return;
      const requestId = payload.requestId ?? null;
      if (requestId) {
        if (seenRequestIdsRef.current.has(requestId)) {
          return;
        }
        seenRequestIdsRef.current.add(requestId);
      }
      receiveRemotePhoto(payload.image, payload.slot);
    };

    const handleProcessingStart = () => setProcessing(true);
    const handleProcessingDone = () => {
      setProcessing(false);
      setStep('COMPLETED');
    };

    socket.on('photo_taken', handlePhotoTaken);
    socket.on('processing_start', handleProcessingStart);
    socket.on('processing_done', handleProcessingDone);

    return () => {
      socket.off('photo_taken', handlePhotoTaken);
      socket.off('processing_start', handleProcessingStart);
      socket.off('processing_done', handleProcessingDone);
    };
  }, [sessionId, receiveRemotePhoto, setProcessing, setStep]);

  useEffect(() => {
    if (step === 'CAPTURE' && capturedCount >= totalShots) {
      setStep('SELECTION');
    }
  }, [capturedCount, totalShots, step, setStep]);

  const handleTimerSelect = (seconds: number) => {
    setTimer(seconds);
  };

  const handleCapture = () => {
    takeShot();
  };

  const handleFrameChange = (frameId: string) => {
    setFrame(frameId);
  };

  const handleFilterChange = (filterId: string) => {
    setFilter(filterId);
  };

  const handleFinish = () => {
    if (!sessionId) return;
    socket.emit('trigger_finish', sessionId);
    setProcessing(true);
  };

  const captureDisabled = isCapturePending || capturedCount >= totalShots;
  const canProceedSelection = selectedPhotoIndices.length === requiredShots;

  const renderConfigStep = () => (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">Select a timer duration to begin</p>
      <div className="grid grid-cols-3 gap-3">
        {TIMER_OPTIONS.map(option => (
          <Button
            key={option}
            onClick={() => handleTimerSelect(option)}
            variant={timerDuration === option ? 'default' : 'outline'}
            disabled={isProcessing}
          >
            {option}s
          </Button>
        ))}
      </div>
    </div>
  );

  const renderCaptureStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Shot {capturedCount} / {totalShots}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {photoPreviews.map((preview, index) => (
          <div key={index} className="rounded-lg border border-dashed border-gray-300 h-24 flex items-center justify-center overflow-hidden">
            {preview ? <img src={preview} alt={`shot-${index}`} className="object-cover w-full h-full" /> : <span className="text-xs text-muted-foreground">Waiting</span>}
          </div>
        ))}
      </div>
      <Button
        size="lg"
        className="w-full h-16 text-xl font-bold"
        onClick={handleCapture}
        disabled={captureDisabled || isProcessing}
      >
        {isCapturePending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Capturing...
          </>
        ) : (
          <>
            <Camera className="w-5 h-5 mr-2" />
            Capture
          </>
        )}
      </Button>
    </div>
  );

  const renderSelectionStep = () => (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">Select {requiredShots} photos</p>
      <div className="grid grid-cols-3 gap-3">
        {photoPreviews.map((preview, index) => {
          const selected = selectedPhotoIndices.includes(index);
          return (
            <button
              key={index}
              className={`rounded-lg border-4 overflow-hidden aspect-[3/4] ${selected ? 'border-black' : 'border-transparent'}`}
              onClick={() => togglePhotoSelection(index)}
              disabled={!preview}
            >
              {preview ? (
                <img src={preview} alt={`preview-${index}`} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-muted-foreground">
                  Empty
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-center text-sm">Selected: {selectedPhotoIndices.length} / {requiredShots}</p>
      <Button onClick={confirmSelection} disabled={!canProceedSelection} className="w-full h-12 text-lg">
        Next
      </Button>
    </div>
  );

  const renderReviewStep = () => {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <p className="font-semibold text-lg text-center">Chọn Frame</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {FRAME_OPTIONS.map(frame => (
              <button
                key={frame.id}
                onClick={() => handleFrameChange(frame.id)}
                className={`relative group rounded-xl overflow-hidden aspect-[2480/3508] transition-all duration-200 ${selectedFrameId === frame.id
                  ? 'ring-4 ring-black shadow-xl scale-[1.02]'
                  : 'ring-1 ring-gray-200 hover:ring-2 hover:ring-gray-300'
                  }`}
              >
                <img
                  src={frame.image}
                  alt={frame.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white py-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {frame.label}
                </div>
                {selectedFrameId === frame.id && (
                  <div className="absolute top-2 right-2 bg-black text-white rounded-full p-1 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <p className="font-semibold text-lg text-center">Chọn Bộ Lọc</p>
          <div className="flex justify-center gap-4 flex-wrap">
            {FILTER_OPTIONS.map(filter => (
              <Button
                key={filter.id}
                variant={selectedFilter === filter.id ? 'default' : 'outline'}
                onClick={() => handleFilterChange(filter.id)}
                size="lg"
                className="min-w-[120px]"
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        <Button className="w-full h-16 text-xl font-bold mt-8" onClick={handleFinish} disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            'Hoàn thành / In ảnh'
          )}
        </Button>
      </div>
    );
  };

  const renderCompletedStep = () => (
    <div className="space-y-4 text-center">
      <p className="text-lg font-semibold">Session completed!</p>
      <p className="text-sm text-muted-foreground">Scan QR on the monitor to download.</p>
      <Button variant="outline" className="w-full" onClick={resetSession}>
        Start New Session
      </Button>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 'CAPTURE':
        return renderCaptureStep();
      case 'SELECTION':
        return renderSelectionStep();
      case 'REVIEW':
        return renderReviewStep();
      case 'COMPLETED':
        return renderCompletedStep();
      default:
        return renderConfigStep();
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Photobooth Controller</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">Start a new session to begin.</p>
            <Button onClick={handleCreateSession} disabled={isCreating} className="w-full h-14 text-lg">
              {isCreating ? 'Creating...' : 'Start Session'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-5xl">
        <CardHeader>
          <CardTitle className="text-center">Photobooth Controller</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <p className="text-xs text-muted-foreground">Session ID</p>
            <p className="font-mono text-sm">{sessionId}</p>
            <p className="text-xs text-muted-foreground mt-2">Share Link</p>
            <p className="font-mono text-sm break-all">{origin}/share/{sessionId}</p>
          </div>
          {renderStepContent()}
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
