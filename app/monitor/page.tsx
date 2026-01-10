'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Webcam from 'react-webcam';

import { BoothProvider, useBooth } from '@/context/BoothContext';
import { socket } from '@/lib/socket';
import { QRCodeResult } from '@/components/QRCodeResult';
import { Button } from '@/components/ui/button';
import { uploadSessionMedia } from '@/api/endpoints/sessions/sessions';
import { getLayoutConfig, DEFAULT_OVERLAY_CONFIG } from '@/app/config/layouts';

const FRAME_ASSETS: Record<string, string | null> = {
  'frame-1': 'https://cdn.freehihi.com/68fdab4e38d77.png',
  'frame-2': null,
  'frame-3': null,


  'frame-danang': '/frame-da-nang.png',
  'frame-bao-xuan': '/frame-bao-xuan.png',
  'frame-chuyen-tau': '/frame-chuyen-tau-thanh-xuan.png',
  'frame-final-1': '/frame-final-1.png',
  'frame-cuoi-1': '/frame-cuoi-1.png',
  'frame-cuoi-2': '/frame-cuoi-2.png',
  'frame-cuoi-3': '/frame-cuoi-3.png',
  'frame-quan-su': '/frame-quan-su.png',
  'frame-lich-xanh-duong': '/frame-lich-xanh-duong.png',
  'frame-lich-hong': '/frame-lich-hong.png',
  'frame-lich-xanh': '/frame-lich-xanh.png',
  'frame-lich-xam': '/frame-lich-xam.png',
  'frame-lich-den': '/frame-lich-den.png'
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

// --- CONFIGURATION FOR OVERLAY TEXT ---
const FRAME_TEXT_COLORS: Record<string, string> = {
  'frame-danang': '#a40000',
  'frame-bao-xuan': '#4e6f39',
  'frame-chuyen-tau': '#966725',
  'frame-final-1': '#000000',
  'frame-cuoi-1': '#a40000',
  'frame-cuoi-2': '#e4f407ff',
  'frame-cuoi-3': '#ffffffff',
  'frame-quan-su': '#4e6f39',
  'frame-lich-xanh-duong': '#0072f4ff',
  'frame-lich-hong': '#000000ff',
  'frame-lich-xanh': '#000000ff',
  'frame-lich-xam': '#000000ff',
  'frame-lich-den': '#ffffffff'
};


// --- OVERLAY CONFIG MOVED TO layouts.ts ---

// Helper: Load Image safely via HTMLImageElement (Compatible with Base64 & CORS)

// Helper: Load Image safely via HTMLImageElement (Compatible with Base64 & CORS)
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Good practice
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};
// --------------------------------------

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
    customMessage,
    signatureData,
  } = useBooth();



  const webcamRef = useRef<Webcam>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const lastCaptureIdRef = useRef<string | null>(null);
  const clipRecorderRef = useRef<MediaRecorder | null>(null);
  const clipChunksRef = useRef<Blob[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('Chờ controller bắt đầu...');
  const [shareUrl, setShareUrl] = useState('');
  const [finalPreviewUrl, setFinalPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Use a Ref to track signature data to avoid stale closures in async callbacks
  // update: Listen directly to socket for fastest update, bypassing React state cycle
  const signatureDataRef = useRef<string | null>(signatureData);

  useEffect(() => {
    // Sync ref with context state (for initial load or if context updates first)
    if (signatureData) {
      signatureDataRef.current = signatureData;
    }
  }, [signatureData]);

  useEffect(() => {
    // Direct listener to catch the event BEFORE the finish processing trigger fires
    // This races against the Context update, but ensures Ref is populated instantly
    const handleDirectSignature = (payload: { signatureImage: string }) => {
      if (payload?.signatureImage) {
        console.log('⚡️ Monitor Direct Socket: Received Signature -> Updating Ref Immediately');
        signatureDataRef.current = payload.signatureImage;
      }
    };

    socket.on('sync_signature', handleDirectSignature);
    return () => {
      socket.off('sync_signature', handleDirectSignature);
    };
  }, []);

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
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(mediaStream, { mimeType });
      clipChunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data?.size > 0) {
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

  const isCustomFrame = ['frame-danang', 'frame-bao-xuan', 'frame-chuyen-tau', 'frame-final-1', 'frame-cuoi-1', 'frame-cuoi-2', 'frame-cuoi-3', 'frame-quan-su', 'frame-lich-xanh-duong', 'frame-lich-hong', 'frame-lich-xanh', 'frame-lich-xam', 'frame-lich-den'].includes(selectedFrameId);

  const composeStripImage = useCallback(async () => {
    const selectedBlobs = selectedPhotoIndices
      .map(index => rawPhotos[index])
      .filter((blob): blob is Blob => Boolean(blob));

    if (!isCustomFrame && selectedBlobs.length !== requiredShots) {
      throw new Error('Thiếu ảnh được chọn');
    }

    const bitmaps = await Promise.all(selectedBlobs.map(blob => createImageBitmap(blob)));
    const canvas = document.createElement('canvas');

    if (isCustomFrame) {
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

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.filter = CANVAS_FILTER_MAP[selectedFilter] ?? 'none';

    ctx.filter = CANVAS_FILTER_MAP[selectedFilter] ?? 'none';

    // DYNAMIC LAYOUT RENDERING
    const layoutConfig = getLayoutConfig(selectedFrameId);
    const slots = layoutConfig.slots;

    slots.forEach((slot, index) => {
      if (index < bitmaps.length) {
        const bitmap = bitmaps[index];
        const dx = slot.x * canvas.width;
        const dy = slot.y * canvas.height;
        const dw = slot.w * canvas.width;
        const dh = slot.h * canvas.height;

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

    bitmaps.forEach(bitmap => bitmap.close());
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

    // Draw Overlay Text (Timestamp & Message)
    if (isCustomFrame) {
      const now = new Date();
      // Format: 17h37, 31/12/2025
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      const timestampText = `${hours}h${minutes}, ${day}/${month}/${year}`;

      // --- USE OVERLAY_CONFIG FROM LAYOUT ---
      const { TIMESTAMP, MESSAGE, EXPORT_CONFIG } = layoutConfig.overlay ?? DEFAULT_OVERLAY_CONFIG;
      const textColor = FRAME_TEXT_COLORS[selectedFrameId] || '#2c2c2c';

      // 1. Timestamp
      const tsFontSize = Math.round(canvas.height * TIMESTAMP.FONT_SIZE_PERCENT * EXPORT_CONFIG.FONT_SCALE);
      const tsFontStyle = TIMESTAMP.FONT_STYLE || 'normal';
      ctx.font = `${tsFontStyle} ${tsFontSize}px ${TIMESTAMP.FONT_FAMILY}`;
      ctx.fillStyle = textColor;
      ctx.textBaseline = 'top';
      ctx.textAlign = TIMESTAMP.ALIGN;

      // Calculate X based on alignment
      let tsX = 0;
      if (TIMESTAMP.ALIGN === 'right') {
        tsX = (TIMESTAMP.LEFT_PERCENT + TIMESTAMP.WIDTH_PERCENT) * canvas.width;
      } else if (TIMESTAMP.ALIGN === 'center') {
        tsX = (TIMESTAMP.LEFT_PERCENT + TIMESTAMP.WIDTH_PERCENT / 2) * canvas.width;
      } else {
        tsX = TIMESTAMP.LEFT_PERCENT * canvas.width;
      }

      // FIX: Manually shift Timestamp right for 'frame-lich-xanh-duong' only in Export to match printed expectation
      if (selectedFrameId === 'frame-lich-xanh-duong' || selectedFrameId === 'frame-lich-hong' || selectedFrameId === 'frame-lich-xanh' || selectedFrameId === 'frame-lich-xam' || selectedFrameId === 'frame-lich-den') {
        tsX += canvas.width * 0.03;
      }

      const tsY = (TIMESTAMP.TOP_PERCENT + EXPORT_CONFIG.TOP_OFFSET_PERCENT) * canvas.height;

      ctx.fillText(timestampText, tsX, tsY);

      // 2. Message
      const msgFontSize = Math.round(canvas.height * MESSAGE.FONT_SIZE_PERCENT * EXPORT_CONFIG.FONT_SCALE);
      const msgFontStyle = MESSAGE.FONT_STYLE || 'normal';
      ctx.font = `${msgFontStyle} ${msgFontSize}px ${MESSAGE.FONT_FAMILY}`;
      ctx.textAlign = MESSAGE.ALIGN;

      let msgX = 0;
      if (MESSAGE.ALIGN === 'right') {
        msgX = (MESSAGE.LEFT_PERCENT + MESSAGE.WIDTH_PERCENT) * canvas.width;
      } else if (MESSAGE.ALIGN === 'center') {
        msgX = (MESSAGE.LEFT_PERCENT + MESSAGE.WIDTH_PERCENT / 2) * canvas.width;
      } else {
        msgX = MESSAGE.LEFT_PERCENT * canvas.width;
      }
      const msgY = (MESSAGE.TOP_PERCENT + EXPORT_CONFIG.TOP_OFFSET_PERCENT) * canvas.height;

      const message = customMessage || 'itmedia';
      ctx.fillText(message, msgX, msgY);

      // 3. Signature
      // Use Ref to avoid stale closure (Bắt buộc dùng Ref để tránh hàm chạy với giá trị cũ)
      const currentSignature = signatureDataRef.current;
      console.log('🔍 composeStripImage Check:', {
        stateSig: signatureData ? 'Has Data' : 'NULL',
        refSig: currentSignature ? 'Has Data' : 'NULL'
      });

      if (currentSignature) {
        console.log("Signature Data (From Ref) nhận được:", currentSignature.substring(0, 50) + "...");
        try {
          const signatureImg = await loadImage(currentSignature);

          // Update position based on User Analysis (Bottom Left Slot)
          // Tọa độ (left, top): 3.8% W, 77.0% H
          // Kích thước (width, height): 44.5% W, 17.5% H
          const sigX = canvas.width * 0.038;
          const sigY = canvas.height * 0.770;
          const sigW = canvas.width * 0.445;
          const sigH = canvas.height * 0.175;

          // Preserve aspect ratio (contain) in strip image
          const srcRatio = signatureImg.width / signatureImg.height;
          const dstRatio = sigW / sigH;

          let drawW = sigW;
          let drawH = sigH;
          let drawX = sigX;
          let drawY = sigY;

          if (srcRatio > dstRatio) {
            drawH = sigW / srcRatio;
            drawY = sigY + (sigH - drawH) / 2;
          } else {
            drawW = sigH * srcRatio;
            drawX = sigX + (sigW - drawW) / 2;
          }

          ctx.drawImage(signatureImg, drawX, drawY, drawW, drawH);

          console.log('✅ Drawn signature on canvas (Bottom Left Slot via Ref)');
        } catch (e) {
          console.warn('Failed to draw signature', e);
        }
      } else {
        console.warn('⚠️ composeStripImage: Ref is NULL (Missing signature data)');
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
  }, [rawPhotos, requiredShots, selectedFilter, selectedFrameId, selectedPhotoIndices, isCustomFrame, customMessage, signatureData]);


  const composeVideoRecap = useCallback(async (): Promise<Blob | null> => {
    const available = selectedPhotoIndices
      .map(index => rawVideoClips[index])
      .filter((clip): clip is Blob => Boolean(clip));

    if (available.length === 0) {
      return null;
    }

    let slots: Blob[] = [...available];

    // Use dynamic photo count from config
    const layoutConfig = getLayoutConfig(selectedFrameId);
    const targetCount = layoutConfig.photoCount;

    while (slots.length < targetCount && available.length > 0) {
      slots.push(available[slots.length % available.length]);
    }
    const clips = slots.slice(0, targetCount);

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

      let overlayImage: HTMLImageElement | null = null;
      const overlayUrl = FRAME_ASSETS[selectedFrameId] ?? null;
      if (overlayUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.src = overlayUrl;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          overlayImage = img;
        } catch (e) {
          console.warn('Overlay load failed for video', e);
        }
      }

      let signatureImage: HTMLImageElement | null = null;
      // FIX: Use Ref to avoid stale closure in video generation
      const currentSignature = signatureDataRef.current;
      if (currentSignature) {
        try {
          signatureImage = await loadImage(currentSignature);
          console.log('✅ Loaded signature for video (via Ref)');
        } catch (e) {
          console.warn('Signature load failed for video', e);
        }
      }

      const canvas = document.createElement('canvas');
      if (isCustomFrame) {
        canvas.width = 1080;
        canvas.height = 1528;
      } else {
        canvas.width = 1080;
        canvas.height = 1920;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx || !canvas.captureStream) {
        videos.forEach(video => URL.revokeObjectURL(video.src));
        return clips[0] ?? null;
      }
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => {
        if (event.data?.size > 0) {
          chunks.push(event.data);
        }
      };
      const recordingPromise = new Promise<Blob>(resolve => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: 'video/webm' }));
        };
      });

      videos.forEach(video => {
        video.loop = true;
        video.currentTime = 0;
        void video.play();
      });

      recorder.start();

      const durations = videos.map(video => {
        const d = video.duration;
        return (Number.isFinite(d) && d > 1.5) ? d : 5;
      });
      // Enforce minimum 5s per loop (10s total) to prevent short videos
      const baseDuration = Math.max(...durations, 5);
      const targetDuration = baseDuration * 2 * 1000;

      const startTime = performance.now();

      const drawFrame = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);



        if (performance.now() - startTime < targetDuration) {
          // Dynamic Video Rendering
          const slots = layoutConfig.slots;

          slots.forEach((slot, index) => {
            if (index < videos.length) {
              const video = videos[index];
              const dx = slot.x * canvas.width;
              const dy = slot.y * canvas.height;
              const dw = slot.w * canvas.width;
              const dh = slot.h * canvas.height;

              const vW = video.videoWidth;
              const vH = video.videoHeight;
              const srcRatio = vW / vH;
              const dstRatio = dw / dh;
              let sx = 0, sy = 0, sw = vW, sh = vH;

              if (srcRatio > dstRatio) {
                sw = vH * dstRatio;
                sx = (vW - sw) / 2;
              } else {
                sh = vW / dstRatio;
                sy = (vH - sh) / 2;
              }

              ctx.save();
              ctx.translate(dx + dw, dy);
              ctx.scale(-1, 1);
              ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
              ctx.restore();
            }
          });
        }

        // For standard transparent frames, draw overlay on top
        // For standard transparent frames, draw overlay on top
        if (overlayImage) {
          ctx.drawImage(overlayImage, 0, 0, canvas.width, canvas.height);
        }

        // Draw Overlay Text (Timestamp & Message)
        if (isCustomFrame) {
          const now = new Date();
          const hours = now.getHours().toString().padStart(2, '0');
          const minutes = now.getMinutes().toString().padStart(2, '0');
          const day = now.getDate().toString().padStart(2, '0');
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const year = now.getFullYear();
          const timestampText = `${hours}h${minutes}, ${day}/${month}/${year}`;

          // Adjust font size for canvas resolution (width 1080)
          // Original was 55px for 2480w. Now 45px/2480 ~ 1.8%
          // For 1080w, size ~ 19.5px -> 20px
          // --- USE OVERLAY_CONFIG FROM LAYOUT ---
          const { TIMESTAMP, MESSAGE, EXPORT_CONFIG } = layoutConfig.overlay ?? DEFAULT_OVERLAY_CONFIG;
          const textColor = FRAME_TEXT_COLORS[selectedFrameId] || '#2c2c2c';

          // 1. Timestamp
          // Apply FONT_SCALE for export
          // Apply FONT_SCALE for export
          const tsFontSize = Math.round(canvas.height * TIMESTAMP.FONT_SIZE_PERCENT * EXPORT_CONFIG.FONT_SCALE);
          const tsFontStyle = TIMESTAMP.FONT_STYLE || 'normal';
          ctx.font = `${tsFontStyle} ${tsFontSize}px ${TIMESTAMP.FONT_FAMILY}`;
          ctx.fillStyle = textColor;
          ctx.textBaseline = 'top';
          ctx.textAlign = TIMESTAMP.ALIGN;

          let tsX = 0;
          if (TIMESTAMP.ALIGN === 'right') {
            tsX = (TIMESTAMP.LEFT_PERCENT + TIMESTAMP.WIDTH_PERCENT) * canvas.width;
          } else if (TIMESTAMP.ALIGN === 'center') {
            tsX = (TIMESTAMP.LEFT_PERCENT + TIMESTAMP.WIDTH_PERCENT / 2) * canvas.width;
          } else {
            tsX = TIMESTAMP.LEFT_PERCENT * canvas.width;
          }

          // FIX: Manually shift Timestamp right for specific frames in Export/Video to match printed expectation
          if (selectedFrameId === 'frame-lich-xanh-duong' || selectedFrameId === 'frame-lich-hong' || selectedFrameId === 'frame-lich-xanh' || selectedFrameId === 'frame-lich-xam' || selectedFrameId === 'frame-lich-den') {
            tsX += canvas.width * 0.03;
          }

          // Apply TOP_OFFSET_PERCENT for export
          const tsY = (TIMESTAMP.TOP_PERCENT + EXPORT_CONFIG.TOP_OFFSET_PERCENT) * canvas.height;
          ctx.fillText(timestampText, tsX, tsY);

          // 2. Message
          // Apply FONT_SCALE for export
          const msgFontSize = Math.round(canvas.height * MESSAGE.FONT_SIZE_PERCENT * EXPORT_CONFIG.FONT_SCALE);
          const msgFontStyle = MESSAGE.FONT_STYLE || 'normal';
          ctx.font = `${msgFontStyle} ${msgFontSize}px ${MESSAGE.FONT_FAMILY}`;
          ctx.textAlign = MESSAGE.ALIGN;

          let msgX = 0;
          if (MESSAGE.ALIGN === 'right') {
            msgX = (MESSAGE.LEFT_PERCENT + MESSAGE.WIDTH_PERCENT) * canvas.width;
          } else if (MESSAGE.ALIGN === 'center') {
            msgX = (MESSAGE.LEFT_PERCENT + MESSAGE.WIDTH_PERCENT / 2) * canvas.width;
          } else {
            msgX = MESSAGE.LEFT_PERCENT * canvas.width;
          }
          // Apply TOP_OFFSET_PERCENT for export
          const msgY = (MESSAGE.TOP_PERCENT + EXPORT_CONFIG.TOP_OFFSET_PERCENT) * canvas.height;

          const message = customMessage || 'itmedia';
          ctx.fillText(message, msgX, msgY);

          // 3. Signature
          if (signatureImage) {
            // Update position based on User Analysis (Bottom Left Slot)
            const sigX = canvas.width * 0.038;
            const sigY = canvas.height * 0.770;
            const sigW = canvas.width * 0.445;
            const sigH = canvas.height * 0.175;

            // Preserve aspect ratio (contain)
            const srcRatio = signatureImage.width / signatureImage.height;
            const dstRatio = sigW / sigH;

            let drawW = sigW;
            let drawH = sigH;
            let drawX = sigX;
            let drawY = sigY;

            if (srcRatio > dstRatio) {
              drawH = sigW / srcRatio;
              drawY = sigY + (sigH - drawH) / 2;
            } else {
              drawW = sigH * srcRatio;
              drawX = sigX + (sigW - drawW) / 2;
            }

            ctx.drawImage(signatureImage, drawX, drawY, drawW, drawH);
          }
        }

        if (performance.now() - startTime < targetDuration) {
          requestAnimationFrame(drawFrame);
        } else if (recorder.state === 'recording') {
          recorder.stop();
        }
      };

      requestAnimationFrame(drawFrame);
      const resultBlob = await recordingPromise;

      videos.forEach(video => {
        video.pause();
        URL.revokeObjectURL(video.src);
      });
      return resultBlob;

    } catch (error) {
      console.warn('Không thể ghép video recap', error);
      return clips[0] ?? null;
    }
  }, [rawVideoClips, requiredShots, selectedFrameId, selectedPhotoIndices, isCustomFrame, customMessage, signatureData]);


  const finishProcessing = useCallback(async () => {
    if (!sessionId) return;
    setUploadError(null);
    setIsUploading(true);
    setStatusMessage('Đang xử lý & upload (V2 fix)...');
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

      // Upload selected original photos
      selectedPhotoIndices.forEach((index) => {
        const blob = rawPhotos[index];
        if (blob) {
          uploads.push(uploadSessionMedia(sessionId, { file: blob }, { type: 'ORIGINAL' }));
        }
      });

      if (videoBlob) {
        uploads.push(uploadSessionMedia(sessionId, { file: videoBlob }, { type: 'VIDEO' }));
      }

      // Upload Signature
      if (signatureData) {
        try {
          const sigBlob = await fetch(signatureData).then(res => res.blob());
          uploads.push(uploadSessionMedia(sessionId, { file: sigBlob }, { type: 'SIGNATURE' as any }));
        } catch (error) {
          console.warn('Failed to upload signature', error);
        }
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
      case 'FRAME_SELECTION':
        setStatusMessage('Đang chờ chọn khung hình...');
        break;
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

  const showPreviewStrip = step === 'SELECTION' || step === 'REVIEW' || step === 'COMPLETED';

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
        {/* If we are in Selection/Review/Completed, show the result. Else show Webcam */}
        {(step === 'SELECTION' || step === 'REVIEW' || step === 'COMPLETED') ? (
          <div className="flex gap-12 items-center justify-center h-full w-full">
            {/* Live Preview Strip */}
            {showPreviewStrip && (
              <div className="relative overflow-hidden rounded-xl bg-white shadow-2xl h-[65vh] w-auto border border-black/10"
                style={{
                  aspectRatio: isCustomFrame ? '2480/3508' : '1080/1920',
                  containerType: 'inline-size'
                }}>
                {isCustomFrame ? (
                  <div className={`relative w-full h-full ${filterClass}`}>
                    {/* Render slots based on configuration */}
                    {(() => {
                      const layoutConfig = getLayoutConfig(selectedFrameId);
                      return layoutConfig.slots.map((slot, index) => (
                        <div
                          key={index}
                          className="absolute overflow-hidden custom-slot bg-black/5 flex items-center justify-center border border-black/5"
                          style={{
                            top: `${slot.y * 100}%`,
                            left: `${slot.x * 100}%`,
                            width: `${slot.w * 100}%`,
                            height: `${slot.h * 100}%`,
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
                      ));
                    })()}
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

                {/* DOM Overlay Text for Live Preview */}
                {isCustomFrame && (() => {
                  const currentOverlayConfig = getLayoutConfig(selectedFrameId).overlay ?? DEFAULT_OVERLAY_CONFIG;
                  const { TIMESTAMP, MESSAGE } = currentOverlayConfig;

                  return (
                    <div className="absolute inset-0 pointer-events-none z-20" style={{ lineHeight: 1, color: FRAME_TEXT_COLORS[selectedFrameId] || '#2c2c2c' }}>
                      {/* Timestamp */}
                      <div className="absolute flex items-start justify-end pr-[1%]"
                        style={{
                          fontFamily: TIMESTAMP.FONT_FAMILY,
                          fontStyle: TIMESTAMP.FONT_STYLE || 'normal',
                          fontSize: `${TIMESTAMP.FONT_SIZE_PERCENT * 100}cqh`,
                          top: `${TIMESTAMP.TOP_PERCENT * 100}%`,
                          left: `${TIMESTAMP.LEFT_PERCENT * 100}%`,
                          width: `${TIMESTAMP.WIDTH_PERCENT * 100}%`
                        }}>
                        {(() => {
                          const now = new Date();
                          const hours = now.getHours().toString().padStart(2, '0');
                          const minutes = now.getMinutes().toString().padStart(2, '0');
                          const day = now.getDate().toString().padStart(2, '0');
                          const month = (now.getMonth() + 1).toString().padStart(2, '0');
                          const year = now.getFullYear();
                          return `${hours}h${minutes},${day}/${month}/${year}`;
                        })()}
                      </div>
                      {/* Message */}
                      <div className="absolute flex items-start justify-center text-center"
                        style={{
                          fontFamily: MESSAGE.FONT_FAMILY,
                          fontStyle: MESSAGE.FONT_STYLE || 'normal',
                          fontSize: `${MESSAGE.FONT_SIZE_PERCENT * 100}cqh`,
                          top: `${MESSAGE.TOP_PERCENT * 100}%`,
                          left: `${MESSAGE.LEFT_PERCENT * 100}%`,
                          width: `${MESSAGE.WIDTH_PERCENT * 100}%`
                        }}>
                        {customMessage || 'itmedia'}
                      </div>
                    </div>
                  );
                })()}

                {/* Signature Overlay */}
                {signatureData && (
                  <img
                    src={signatureData}
                    alt="Signature"
                    className="absolute z-50 pointer-events-none"
                    style={{
                      width: '30%',
                      right: '5%',
                      bottom: '5%',
                      opacity: 0.9,
                    }}
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
              mirrored={true}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'user', width: 1920, height: 1080 }}
              className={`w-full h-full object-cover ${filterClass}`}
            />
            {/* Countdown Overlay - Huge Center Text */}
            {countdown && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <span className="text-white text-[15rem] font-black animate-pulse font-mono leading-none drop-shadow-2xl">{countdown}</span>
              </div>
            )}

            {/* FRAME_SELECTION Overlay - Informational */}
            {step === 'FRAME_SELECTION' && (
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 z-30 pointer-events-none">
                {/* <div className="bg-black/50 backdrop-blur-md text-white px-8 py-4 rounded-full flex items-center gap-4 animate-in fade-in slide-in-from-bottom-10">
                  <svg className="w-8 h-8 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  <p className="text-xl font-bold">Vui lòng chọn khung ảnh trên Tablet</p>
                </div> */}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Grid - 6 Slots */}
      {step !== 'REVIEW' && (
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
      )}

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