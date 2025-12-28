'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Camera } from 'lucide-react';

import { useCreateSession } from '@/api/endpoints/sessions/sessions';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BoothProvider, useBooth } from '@/context/BoothContext';

const TIMER_OPTIONS = [7, 10];
const FRAME_OPTIONS = [
  { id: 'frame-danang', label: 'Đà Nẵng', image: '/frame-da-nang.png' },
  { id: 'frame-bao-xuan', label: 'Báo Xuân', image: '/frame-bao-xuan.png' },
  { id: 'frame-chuyen-tau', label: 'Chuyến tàu', image: '/frame-chuyen-tau-thanh-xuan.png' },
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
    customMessage,
    setCustomMessage,
  } = useBooth();

  const { mutate: createSession, isPending: isCreating } = useCreateSession();
  const [origin, setOrigin] = useState('');
  const [localTimer, setLocalTimer] = useState(10);
  const monitorWindow = useRef<Window | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleCreateSession = () => {
    createSession({ data: {} as any }, {
      onSuccess: response => {
        const id = response.data.id;
        if (id) {
          setSessionId(id);
          socket.connect();
          socket.emit('join', id);
        }
      },
      onError: error => {
        console.error('Failed to create session', error);
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
    setLocalTimer(seconds);
  };

  const handleStartCapture = () => {
    setTimer(localTimer);
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
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Bắt đầu chụp</h2>
        <p className="text-muted-foreground">Chọn thời gian đếm ngược để bắt đầu</p>
      </div>
      <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
        {TIMER_OPTIONS.map(option => (
          <Button
            key={option}
            onClick={() => handleTimerSelect(option)}
            variant={localTimer === option ? 'default' : 'outline'}
            disabled={isProcessing}
            className={`h-32 text-4xl font-bold rounded-2xl transition-all ${localTimer === option
              ? 'bg-black text-white shadow-xl scale-105 ring-4 ring-gray-200'
              : 'hover:bg-gray-50 border-2 hover:border-black'
              }`}
          >
            {option}s
          </Button>
        ))}
      </div>

      <div className="max-w-lg mx-auto pt-4">
        <Button
          onClick={handleStartCapture}
          disabled={isProcessing}
          className="w-full h-20 text-2xl font-bold rounded-2xl shadow-xl hover:scale-[1.02] transition-transform bg-black text-white"
        >
          Bắt Đầu Chụp 📸
        </Button>
      </div>
    </div>
  );

  const renderCaptureStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Đang chụp ảnh</h2>
        <p className="text-lg text-muted-foreground mt-1">Ảnh {capturedCount} / {totalShots}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {photoPreviews.map((preview, index) => (
          <div
            key={index}
            className={`
              relative rounded-xl overflow-hidden aspect-video flex items-center justify-center 
              ${preview ? 'bg-black shadow-md' : 'bg-gray-100 border-2 border-dashed border-gray-300'}
            `}
          >
            {preview ? (
              <img src={preview} alt={`shot-${index}`} className="object-cover w-full h-full" />
            ) : (
              <span className="text-sm font-medium text-gray-400">Ảnh {index + 1}</span>
            )}
            {index === capturedCount && !preview && (
              <div className="absolute inset-0 bg-black/5 animate-pulse" />
            )}
          </div>
        ))}
      </div>

      <Button
        size="lg"
        className="w-full h-24 text-2xl font-bold rounded-2xl shadow-lg mt-4 bg-black hover:bg-gray-900 active:scale-[0.98] transition-all"
        onClick={handleCapture}
        disabled={captureDisabled || isProcessing}
      >
        {isCapturePending ? (
          <>
            <Loader2 className="w-8 h-8 mr-3 animate-spin" />
            Đang xử lý...
          </>
        ) : (
          <>
            <Camera className="w-8 h-8 mr-3" />
            Chụp Ngay
          </>
        )}
      </Button>
    </div>
  );

  const renderSelectionStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold">Chọn ảnh ưng ý</h2>
        <p className="text-muted-foreground">Chọn {requiredShots} ảnh đẹp nhất để in</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {photoPreviews.map((preview, index) => {
          const selected = selectedPhotoIndices.includes(index);
          const selectionOrder = selectedPhotoIndices.indexOf(index) + 1;

          return (
            <button
              key={index}
              className={`
                relative rounded-xl overflow-hidden aspect-video transition-all duration-200
                ${selected
                  ? 'ring-4 ring-black shadow-xl scale-[1.02]'
                  : 'ring-1 ring-gray-200 hover:ring-2 hover:ring-gray-300'}
              `}
              onClick={() => togglePhotoSelection(index)}
              disabled={!preview}
            >
              {preview ? (
                <>
                  <img src={preview} alt={`preview-${index}`} className="object-cover w-full h-full" />
                  {selected && (
                    <div className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black text-white font-bold shadow-md">
                      {selectionOrder}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-muted-foreground">
                  Trống
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 pb-8 sm:static sm:p-0 sm:bg-transparent sm:border-0">
        <p className="text-center text-sm font-medium mb-3">Đã chọn: <span className="text-black font-bold text-lg">{selectedPhotoIndices.length}</span> / {requiredShots}</p>
        <Button
          onClick={confirmSelection}
          disabled={!canProceedSelection}
          className="w-full h-16 text-xl font-bold rounded-xl shadow-lg"
        >
          Tiếp Tục
          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </Button>
      </div>
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
          <p className="font-semibold text-lg text-center">Lời nhắn</p>
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-full max-w-sm">
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Nhập tên..."
                className={`w-full rounded-lg border p-3 text-center text-lg transition-colors ${customMessage.length > 10
                  ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-black focus:ring-gray-200'
                  }`}
                maxLength={30}
              />
              <div className={`absolute -bottom-6 right-0 text-sm font-medium ${customMessage.length > 10 ? 'text-red-500' : 'text-gray-400'
                }`}>
                {customMessage.length}/10
              </div>
            </div>
            {customMessage.length > 10 && (
              <p className="text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                Quá giới hạn số từ
              </p>
            )}
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

        <Button
          className="w-full h-16 text-xl font-bold mt-8"
          onClick={handleFinish}
          disabled={isProcessing || customMessage.length > 10}
        >
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
    <div className="space-y-6 text-center py-10">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 className="text-3xl font-bold">Hoàn tất!</h2>
      <p className="text-lg text-muted-foreground">Quét mã QR trên màn hình lớn để tải ảnh ngay nhé.</p>
      <Button variant="outline" className="w-full h-16 text-xl font-medium mt-8 border-2" onClick={resetSession}>
        Chụp Lượt Mới
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
            <p className="text-muted-foreground text-lg mb-8">Chạm vào nút bên dưới để bắt đầu phiên chụp mới</p>
            <Button onClick={handleCreateSession} disabled={isCreating} className="w-full h-20 text-2xl font-bold rounded-2xl shadow-xl hover:scale-[1.02] transition-transform">
              {isCreating ? 'Đang tạo...' : 'Bắt Đầu Chụp'}
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
          <CardTitle className="text-center sr-only">Photobooth Controller</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-2">📸 Photobooth Controller</h1>
            <p className="text-sm text-muted-foreground">Mã Phiên: <span className="font-mono font-bold text-black">{sessionId}</span></p>
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
