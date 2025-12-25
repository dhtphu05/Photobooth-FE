'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    if (selectedBlobs.length !== requiredShots) {
      throw new Error('Thiếu ảnh được chọn');
    }
    const bitmaps = await Promise.all(selectedBlobs.map(blob => createImageBitmap(blob)));
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmaps.forEach(bitmap => bitmap.close());
      throw new Error('Canvas không khả dụng');
    }
    ctx.filter = CANVAS_FILTER_MAP[selectedFilter] ?? 'none';
    const slotHeight = canvas.height / requiredShots;
    bitmaps.forEach((bitmap, index) => {
      ctx.drawImage(bitmap, 0, index * slotHeight, canvas.width, slotHeight);
      bitmap.close();
    });
    ctx.filter = 'none';
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
      default:
        setStatusMessage('');
        break;
    }
  }, [isUploading, step]);

  const showPreviewStrip = step === 'REVIEW' || step === 'COMPLETED';

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 gap-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 h-[520px]">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: 'user', width: 1920, height: 1080 }}
            className={`absolute inset-0 w-full h-full object-cover ${filterClass}`}
          />
          {countdown && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-8xl font-bold">
              {countdown}
            </div>
          )}
          {FRAME_ASSETS[selectedFrameId] && (
            <img
              src={FRAME_ASSETS[selectedFrameId] ?? undefined}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              alt="frame overlay"
            />
          )}
        </div>
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-widest">Session</p>
            <p className="font-mono">{sessionId || '—'}</p>
          </div>
          {statusMessage && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/80 min-h-[64px]">
              {statusMessage}
            </div>
          )}
          <div>
            <p className="text-sm text-white/60 mb-2">
              Shots {capturedCount} / {totalShots}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {photoPreviews.map((preview, index) => {
                const selected = selectedPhotoIndices.includes(index);
                return (
                  <div
                    key={index}
                    className={`relative aspect-[3/4] rounded-lg border ${
                      selected ? 'border-green-400' : 'border-white/10'
                    } overflow-hidden bg-white/5 flex items-center justify-center`}
                  >
                    {preview ? (
                      <img src={preview} className="object-cover w-full h-full" alt={`shot-${index}`} />
                    ) : (
                      <span className="text-xs text-white/40">Shot {index + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {showPreviewStrip && (
            <div>
              <p className="text-sm text-white/60 mb-2">Preview</p>
              <div className="relative w-[320px] mx-auto overflow-hidden rounded-xl bg-white">
                <div className={`flex flex-col ${filterClass}`}>
                  {[0, 1, 2].map(index => (
                    <div key={index} className="w-full aspect-[3/4]">
                      {selectedPreviewImages[index] ? (
                        <img
                          src={selectedPreviewImages[index]!}
                          alt={`preview-${index}`}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                          Waiting...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {FRAME_ASSETS[selectedFrameId] && (
                  <img
                    src={FRAME_ASSETS[selectedFrameId] ?? undefined}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    alt="frame overlay"
                  />
                )}
              </div>
            </div>
          )}
          {finalPreviewUrl && (
            <div className="mt-2">
              <p className="text-sm text-white/60 mb-2">Final Strip</p>
              <div className="w-[200px] mx-auto rounded-xl overflow-hidden border border-white/10 bg-white">
                <img src={finalPreviewUrl} alt="final-result" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
          {shareUrl && (
            <QRCodeResult
              url={step === 'COMPLETED' ? shareUrl : undefined}
              isLoading={isUploading}
              errorMessage={uploadError}
              onRetry={
                uploadError
                  ? () => {
                      void finishProcessing();
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>
      {!sessionId && (
        <Button
          variant="outline"
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
          Join Session
        </Button>
      )}
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
