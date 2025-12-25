'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Webcam from 'react-webcam';

import { BoothProvider, useBooth } from '@/context/BoothContext';
import { socket } from '@/lib/socket';
import { QRCodeResult } from '@/components/QRCodeResult';
import { Button } from '@/components/ui/button';
import { uploadSessionMedia } from '@/api/endpoints/sessions/sessions';

const FRAME_ASSETS: Record<string, string | null> = {
  'frame-1': 'https://cdn.freehihi.com/68fdab4e38d77.png',
  'frame-2': null,
  'frame-3': null,
  'frame-bao': '/frame-bao.png',
};

const FILTER_CLASS_MAP: Record<string, string> = {
  normal: '',
  bw: 'grayscale',
  sepia: 'sepia',
};

const CANVAS_FILTER_MAP: Record<string, string> = {
  normal: 'none',
  bw: 'grayscale(1)',
  sepia: 'sepia(1)',
};

const MonitorContent = () => {
  const searchParams = useSearchParams();
  const {
    sessionId,
    setSessionId,
    step,
    setStep,
    timerDuration,
    captureRequestId,
    registerCapturedPhoto,
    acknowledgeCapture,
    photoPreviews,
    rawPhotos,
    rawVideoClips,
    selectedPhotoIndices,
    selectedFrameId,
    selectedFilter,
    requiredShots,
    totalShots,
    capturedCount,
  } = useBooth();

  const webcamRef = useRef<Webcam>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCaptureIdRef = useRef<string | null>(null);
  const clipRecorderRef = useRef<MediaRecorder | null>(null);
  const clipChunksRef = useRef<Blob[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('Chờ controller bắt đầu...');
  const [shareUrl, setShareUrl] = useState('');
  const [finalPreviewUrl, setFinalPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('sessionId');
    if (id) {
      setSessionId(id);
      socket.connect();
      socket.emit('join', id);
      setShareUrl(`${window.location.origin}/share/${id}`);
    }
  }, [searchParams, setSessionId]);

  useEffect(() => () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
  }, []);

  useEffect(() => () => {
    if (finalPreviewUrl) {
      URL.revokeObjectURL(finalPreviewUrl);
    }
  }, [finalPreviewUrl]);

  const startClipRecording = useCallback(() => {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return;
    if (clipRecorderRef.current) {
      if (clipRecorderRef.current.state !== 'inactive') {
        clipRecorderRef.current.stop();
      }
      clipRecorderRef.current = null;
    }
    const videoElement = webcamRef.current?.video ?? null;
    const mediaStream = (videoElement?.srcObject as MediaStream | null) ?? null;
    if (!mediaStream) return;
    try {
      const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm;codecs=vp9' });
      clipChunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data?.size) {
          clipChunksRef.current.push(event.data);
        }
      };
      recorder.start();
      clipRecorderRef.current = recorder;
    } catch (error) {
      console.warn('Unable to start clip recorder', error);
      clipRecorderRef.current = null;
      clipChunksRef.current = [];
    }
  }, []);

  const stopClipRecording = useCallback(() => {
    return new Promise<Blob | null>(resolve => {
      const recorder = clipRecorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }
      const mime = recorder.mimeType || 'video/webm';
      recorder.onstop = () => {
        const blob =
          clipChunksRef.current.length > 0 ? new Blob(clipChunksRef.current, { type: mime }) : null;
        clipRecorderRef.current = null;
        clipChunksRef.current = [];
        resolve(blob);
      };
      if (recorder.state !== 'inactive') {
        recorder.stop();
      } else {
        recorder.onstop?.(new Event('stop'));
      }
    });
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!webcamRef.current) {
      acknowledgeCapture();
      return;
    }
    let clipBlob: Blob | null = null;
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Screenshot unavailable');
      }
      const photoBlob = await fetch(imageSrc).then(res => res.blob());
      clipBlob = await stopClipRecording();
      registerCapturedPhoto(photoBlob, imageSrc, clipBlob || undefined);
      setCountdown(null);
    } catch (error) {
      console.error('Unable to capture photo', error);
      if (!clipBlob) {
        await stopClipRecording();
      }
      acknowledgeCapture();
    }
  }, [acknowledgeCapture, registerCapturedPhoto, stopClipRecording]);

  const beginCountdown = useCallback(
    (seconds: number) => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      startClipRecording();
      if (!seconds || seconds <= 0) {
        setCountdown(null);
        void capturePhoto();
        return;
      }
      setCountdown(seconds);
      countdownIntervalRef.current = window.setInterval(() => {
        setCountdown(prev => {
          if (!prev || prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            void capturePhoto();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [capturePhoto, startClipRecording],
  );

  useEffect(() => {
    if (!captureRequestId || captureRequestId === lastCaptureIdRef.current) return;
    lastCaptureIdRef.current = captureRequestId;
    setStep('CAPTURE');
    beginCountdown(timerDuration);
  }, [captureRequestId, timerDuration, beginCountdown, setStep]);

  const selectedPreviewImages = useMemo(
    () =>
      selectedPhotoIndices
        .map(index => photoPreviews[index] ?? null)
        .filter((src): src is string => Boolean(src)),
    [photoPreviews, selectedPhotoIndices],
  );

  const filterClass = FILTER_CLASS_MAP[selectedFilter] ?? '';

  const composeStripImage = useCallback(async () => {
    const selectedBlobs = selectedPhotoIndices
      .map(index => rawPhotos[index])
      .filter((blob): blob is Blob => Boolean(blob));

    // For frame-bao, we handle exactly 3 photos specifically.
    // For others, we rely on requiredShots (usually 3 or 4).
    if (selectedFrameId !== 'frame-bao' && selectedBlobs.length !== requiredShots) {
      throw new Error('Thiếu ảnh được chọn');
    }
    // If frame-bao but not 3 photos? The UI enforces selection limit, so we assume 3.

    const bitmaps = await Promise.all(selectedBlobs.map(blob => createImageBitmap(blob)));
    const canvas = document.createElement('canvas');

    // Set dimensions based on frame type
    if (selectedFrameId === 'frame-bao') {
      canvas.width = 2480;
      canvas.height = 3508;
    } else {
      canvas.width = 1080;
      canvas.height = 1920;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmaps.forEach(bitmap => bitmap.close());
      throw new Error('Canvas không khả dụng');
    }

    // Fill white background first
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.filter = CANVAS_FILTER_MAP[selectedFilter] ?? 'none';

    if (selectedFrameId === 'frame-bao') {
      const slots = [
        { x: 0.038, y: 0.195, w: 0.924, h: 0.365 }, // Slot Top
        { x: 0.038, y: 0.585, w: 0.445, h: 0.175 }, // Slot Mid Left
        { x: 0.515, y: 0.770, w: 0.445, h: 0.175 }, // Slot Bot Right
      ];

      slots.forEach((slot, index) => {
        if (index < bitmaps.length) {
          const bitmap = bitmaps[index];
          const dx = slot.x * canvas.width;
          const dy = slot.y * canvas.height;
          const dw = slot.w * canvas.width;
          const dh = slot.h * canvas.height;

          // Crop to fill logic
          const srcRatio = bitmap.width / bitmap.height;
          const dstRatio = dw / dh;
          let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;

          if (srcRatio > dstRatio) {
            sw = bitmap.height * dstRatio;
            sx = (bitmap.width - sw) / 2;
          } else {
            sh = bitmap.width / dstRatio;
            sy = (bitmap.height - sh) / 2;
          }
          ctx.drawImage(bitmap, sx, sy, sw, sh, dx, dy, dw, dh);
        }
      });
    } else {
      const slotHeight = canvas.height / requiredShots;
      bitmaps.forEach((bitmap, index) => {
        ctx.drawImage(bitmap, 0, index * slotHeight, canvas.width, slotHeight);
      });
    }

    // Cleanup
    bitmaps.forEach(bitmap => bitmap.close());
    ctx.filter = 'none';

    // Draw Overlay
    const overlayUrl = FRAME_ASSETS[selectedFrameId] ?? null;
    if (overlayUrl) {
      try {
        const frameBlob = await fetch(overlayUrl, { mode: 'cors' }).then(res => res.blob());
        const frameBitmap = await createImageBitmap(frameBlob);
        ctx.drawImage(frameBitmap, 0, 0, canvas.width, canvas.height);
        frameBitmap.close();
      } catch (error) {
        console.warn('Không thể tải frame overlay', error);
      }
    }

    const stripBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Xuất ảnh thất bại'));
        }
      }, 'image/jpeg', 0.95);
    });
    const previewUrl = URL.createObjectURL(stripBlob);
    return { stripBlob, previewUrl };
  }, [rawPhotos, requiredShots, selectedFilter, selectedFrameId, selectedPhotoIndices]);

  const composeVideoRecap = useCallback(async (): Promise<Blob | null> => {
    const available = rawVideoClips.filter((clip): clip is Blob => Boolean(clip));
    if (available.length === 0) {
      return null;
    }
    const slots = [...available];
    while (slots.length < 4 && available.length > 0) {
      slots.push(available[slots.length % available.length]);
    }
    const clips = slots.slice(0, 4);
    if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') {
      return clips[0] ?? null;
    }
    try {
      const videos = await Promise.all(
        clips.map(
          blob =>
            new Promise<HTMLVideoElement>((resolve, reject) => {
              const video = document.createElement('video');
              video.src = URL.createObjectURL(blob);
              video.muted = true;
              video.playsInline = true;
              video.preload = 'auto';
              const cleanup = () => {
                video.onloadeddata = null;
                video.onerror = null;
              };
              video.onloadeddata = () => {
                cleanup();
                resolve(video);
              };
              video.onerror = event => {
                cleanup();
                reject(event);
              };
            }),
        ),
      );
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx || !canvas.captureStream) {
        videos.forEach(video => URL.revokeObjectURL(video.src));
        return clips[0] ?? null;
      }
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => {
        if (event.data?.size) {
          chunks.push(event.data);
        }
      };
      const recordingPromise = new Promise<Blob>(resolve => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: 'video/webm' }));
        };
      });
      const cellHeight = canvas.height / 4;
      videos.forEach(video => {
        video.loop = true;
        video.currentTime = 0;
        void video.play();
      });
      recorder.start();
      const durations = videos.map(video =>
        Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 3,
      );
      const targetDuration = Math.max(...durations, 3) * 2 * 1000;
      let animationFrame = 0;
      const startTime = performance.now();
      const drawFrame = () => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        videos.forEach((video, index) => {
          ctx.drawImage(video, 0, index * cellHeight, canvas.width, cellHeight);
        });
        if (performance.now() - startTime < targetDuration) {
          animationFrame = requestAnimationFrame(drawFrame);
        } else if (recorder.state === 'recording') {
          recorder.stop();
        }
      };
      animationFrame = requestAnimationFrame(drawFrame);
      const resultBlob = await recordingPromise;
      cancelAnimationFrame(animationFrame);
      videos.forEach(video => {
        video.pause();
        URL.revokeObjectURL(video.src);
      });
      return resultBlob;
    } catch (error) {
      console.warn('Không thể ghép video recap', error);
      return clips[0] ?? null;
    }
  }, [rawVideoClips]);

  const finishProcessing = useCallback(async () => {
    if (!sessionId || isUploading) return;
    setUploadError(null);
    setIsUploading(true);
    setStatusMessage('Đang xử lý & upload...');
    socket.emit('processing_start', sessionId);
    try {
      const { stripBlob, previewUrl } = await composeStripImage();
      setFinalPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return previewUrl;
      });
      let videoBlob: Blob | null = null;
      try {
        videoBlob = await composeVideoRecap();
      } catch (error) {
        console.warn('Video recap skipped', error);
      }
      const uploads: Promise<unknown>[] = [
        uploadSessionMedia(sessionId, { file: stripBlob }, { type: 'PROCESSED' }),
      ];
      if (videoBlob) {
        uploads.push(uploadSessionMedia(sessionId, { file: videoBlob }, { type: 'VIDEO' }));
      }
      await Promise.all(uploads);
      setStep('COMPLETED');
      setStatusMessage('Đã sẵn sàng! Quét QR để tải về.');
    } catch (error) {
      console.error('Finish session failed', error);
      setUploadError('Upload thất bại. Nhấn retry để thử lại.');
      setStatusMessage('Upload thất bại, hãy thử lại.');
    } finally {
      socket.emit('processing_done', sessionId);
      setIsUploading(false);
    }
  }, [composeStripImage, composeVideoRecap, isUploading, sessionId, setStep]);

  useEffect(() => {
    if (!sessionId) return;
    const handleTriggerFinish = () => {
      void finishProcessing();
    };
    socket.on('trigger_finish', handleTriggerFinish);
    return () => {
      socket.off('trigger_finish', handleTriggerFinish);
    };
  }, [finishProcessing, sessionId]);

  useEffect(() => {
    if (isUploading) {
      setStatusMessage('Đang xử lý & upload...');
      return;
    }
    switch (step) {
      case 'CONFIG':
        setStatusMessage('Chọn thời gian đếm ngược ở controller để bắt đầu.');
        break;
      case 'CAPTURE':
        setStatusMessage('Chuẩn bị nhé! Đang đếm ngược...');
        break;
      case 'SELECTION':
        setStatusMessage('Chọn 3 tấm đẹp nhất trên controller.');
        break;
      case 'REVIEW':
        setStatusMessage('Xem preview và chọn frame/filter trên controller.');
        break;
      case 'COMPLETED':
        setStatusMessage('Đã hoàn tất. Quét QR để tải ảnh.');
        break;
      case 'PREPARE': // New state if needed, or default
        setStatusMessage('Sẵn sàng...');
        break;
      default:
        setStatusMessage('');
        break;
    }
  }, [isUploading, step]);

  const showPreviewStrip = step === 'REVIEW' || step === 'COMPLETED';

  return (
    <div className="min-h-screen bg-white text-black flex flex-col p-6 gap-6 justify-between">
      {/* Header Info */}
      <div className="flex justify-between items-center w-full max-w-7xl mx-auto z-10">
        <div>
          <p className="text-xs text-black/60 uppercase tracking-widest">Session</p>
          <p className="font-mono text-lg font-bold">{sessionId || '—'}</p>
        </div>
        {statusMessage && (
          <div className="px-6 py-2 rounded-full bg-black/5 border border-black/10 text-lg font-medium animate-pulse text-black">
            {statusMessage}
          </div>
        )}
        <div className="text-right">
          <p className="text-xs text-black/60 uppercase tracking-widest">Shots</p>
          <p className="font-mono text-lg font-bold">{capturedCount} / {totalShots}</p>
        </div>
      </div>

      {/* Main Content Area - Centered */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 relative py-4">
        {/* If we are in Review/Completed, show the result. Else show Webcam */}
        {(step === 'REVIEW' || step === 'COMPLETED') ? (
          <div className="flex gap-12 items-center justify-center h-full w-full">
            {/* Live Preview Strip */}
            {showPreviewStrip && (
              <div className="relative overflow-hidden rounded-xl bg-white shadow-2xl h-[65vh] w-auto border border-black/10"
                style={selectedFrameId === 'frame-bao' ? { aspectRatio: '2480/3508' } : { aspectRatio: '1080/1920' }}>
                {selectedFrameId === 'frame-bao' ? (
                  <div className={`relative w-full h-full ${filterClass}`}>
                    {[
                      { top: '19.5%', left: '3.8%', width: '92.4%', height: '36.5%' },
                      { top: '58.5%', left: '3.8%', width: '44.5%', height: '17.5%' },
                      { top: '77.0%', left: '51.5%', width: '44.5%', height: '17.5%' },
                    ].map((slot, index) => (
                      <div
                        key={index}
                        className="absolute overflow-hidden custom-slot bg-black/5 flex items-center justify-center border border-black/5"
                        style={{
                          top: slot.top,
                          left: slot.left,
                          width: slot.width,
                          height: slot.height,
                        }}
                      >
                        {selectedPreviewImages[index] ? (
                          <img
                            src={selectedPreviewImages[index]!}
                            alt={`preview-${index}`}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-xs text-black/20 font-bold uppercase tracking-widest">Empty</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`flex flex-col w-full h-full ${filterClass}`}>
                    {[0, 1, 2].map(index => (
                      <div key={index} className="w-full flex-1 relative overflow-hidden bg-black/5 border-b border-black/5 last:border-0 flex items-center justify-center">
                        {selectedPreviewImages[index] ? (
                          <img
                            src={selectedPreviewImages[index]!}
                            alt={`preview-${index}`}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-xs text-black/20 font-bold uppercase tracking-widest">Empty</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {FRAME_ASSETS[selectedFrameId] && (
                  <img
                    src={FRAME_ASSETS[selectedFrameId] ?? undefined}
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                    alt="frame overlay"
                  />
                )}
              </div>
            )}

            {/* QR Code & Final if Completed */}
            {step === 'COMPLETED' && (
              <div className="flex flex-col gap-6 text-center bg-black/5 p-8 rounded-3xl border border-black/5 backdrop-blur-sm">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-black/5">
                  {shareUrl && (
                    <QRCodeResult
                      url={step === 'COMPLETED' ? shareUrl : undefined}
                      isLoading={isUploading}
                      errorMessage={uploadError}
                      onRetry={uploadError ? () => void finishProcessing() : undefined}
                    />
                  )}
                </div>
                <div>
                  <p className="text-black font-bold text-2xl tracking-tight">Scan to Download</p>
                  <p className="text-black/50 text-base">Your photos are ready!</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden shadow-2xl h-full max-h-[70vh] aspect-video bg-black ring-4 ring-black/5">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'user', width: 1920, height: 1080 }}
              className={`w-full h-full object-cover ${filterClass}`}
            />
            {/* Countdown Overlay - Huge Center Text */}
            {countdown && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <span className="text-white text-[20rem] font-black animate-pulse font-mono leading-none drop-shadow-2xl">{countdown}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Grid - 6 Slots */}
      <div className="w-full max-w-[1920px] mx-auto">
        <div className="grid grid-cols-6 gap-4">
          {photoPreviews.map((preview, index) => {
            const selected = selectedPhotoIndices.includes(index);
            return (
              <div
                key={index}
                className={`relative aspect-video rounded-xl border-4 ${selected ? 'border-green-500 shadow-xl scale-105 z-10' : 'border-black/5'
                  } overflow-hidden bg-black/5 flex items-center justify-center transition-all duration-300 group`}
              >
                {preview ? (
                  <img src={preview} className="object-cover w-full h-full" alt={`shot-${index}`} />
                ) : (
                  <div className="flex flex-col items-center justify-center opacity-20">
                    <span className="text-4xl font-bold mb-2 text-black">{index + 1}</span>
                  </div>
                )}
                {selected && (
                  <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md z-20">
                    <div className="w-3 h-2 bg-white rounded-[1px] rotate-[-45deg] relative top-[-1px]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!sessionId && (
        <div className="absolute top-6 left-6 z-50">
          <Button
            variant="outline"
            size="sm"
            className="opacity-50 hover:opacity-100 transition-opacity border-black/20 text-black hover:bg-black/5"
            onClick={() => {
              const manualId = prompt('Enter Session ID')?.trim();
              if (manualId) {
                setSessionId(manualId);
                socket.connect();
                socket.emit('join', manualId);
                setShareUrl(`${window.location.origin}/share/${manualId}`);
              }
            }}
          >
            Manual Join
          </Button>
        </div>
      )}
    </div>
  );
};

export default function MonitorPage() {
  return (
    <BoothProvider>
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <MonitorContent />
      </Suspense>
    </BoothProvider>
  );
}
