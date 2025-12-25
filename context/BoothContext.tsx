'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { socket } from '@/lib/socket';

const TOTAL_SHOTS = 6;
const REQUIRED_SHOTS = 3;

export type BoothStep = 'CONFIG' | 'CAPTURE' | 'SELECTION' | 'REVIEW' | 'COMPLETED';

interface BoothContextType {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  timerDuration: number;
  step: BoothStep;
  totalShots: number;
  requiredShots: number;
  capturedCount: number;
  rawPhotos: (Blob | null)[];
  rawVideoClips: (Blob | null)[];
  photoPreviews: (string | null)[];
  selectedPhotoIndices: number[];
  selectedFrameId: string;
  selectedFilter: string;
  captureRequestId: string | null;
  isCapturePending: boolean;
  isProcessing: boolean;
  setTimer: (seconds: number) => void;
  takeShot: () => void;
  acknowledgeCapture: () => void;
  registerCapturedPhoto: (blob: Blob, previewUrl: string, clip?: Blob | null) => void;
  receiveRemotePhoto: (previewUrl: string, slot?: number) => void;
  togglePhotoSelection: (index: number) => void;
  confirmSelection: () => void;
  setFrame: (frameId: string) => void;
  setFilter: (filterId: string) => void;
  setStep: (next: BoothStep) => void;
  setProcessing: (value: boolean) => void;
  resetSession: () => void;
}

const BoothContext = createContext<BoothContextType | undefined>(undefined);

export const BoothProvider = ({ children }: { children: ReactNode }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timerDuration, setTimerDuration] = useState(5);
  const [step, setStep] = useState<BoothStep>('CONFIG');
  const [rawPhotos, setRawPhotos] = useState<(Blob | null)[]>(Array(TOTAL_SHOTS).fill(null));
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>(Array(TOTAL_SHOTS).fill(null));
  const [selectedPhotoIndices, setSelectedPhotoIndices] = useState<number[]>([]);
  const [capturedCount, setCapturedCount] = useState(0);
  const [selectedFrameId, setSelectedFrameId] = useState('frame-1');
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [captureRequestId, setCaptureRequestId] = useState<string | null>(null);
  const captureRequestIdRef = useRef<string | null>(null);
  const [isCapturePending, setIsCapturePending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawVideoClips, setRawVideoClips] = useState<(Blob | null)[]>(Array(TOTAL_SHOTS).fill(null));

  const resetSession = useCallback(() => {
    setSessionId(null);
    setTimerDuration(5);
    setStep('CONFIG');
    setCapturedCount(0);
    setSelectedPhotoIndices([]);
    setRawPhotos(Array(TOTAL_SHOTS).fill(null));
    setPhotoPreviews(Array(TOTAL_SHOTS).fill(null));
    setSelectedFrameId('frame-1');
    setSelectedFilter('normal');
    setRawVideoClips(Array(TOTAL_SHOTS).fill(null));
    setCaptureRequestId(null);
    setIsCapturePending(false);
    setIsProcessing(false);
  }, []);

  const setTimer = useCallback((seconds: number) => {
    setTimerDuration(seconds);
    setStep('CAPTURE');
    setCapturedCount(0);
    setSelectedPhotoIndices([]);
    setRawPhotos(Array(TOTAL_SHOTS).fill(null));
    setPhotoPreviews(Array(TOTAL_SHOTS).fill(null));
    setRawVideoClips(Array(TOTAL_SHOTS).fill(null));
    if (sessionId) {
      socket.emit('update_config', { sessionId, timerDuration: seconds });
    }
  }, [sessionId]);

  const takeShot = useCallback(() => {
    if (!sessionId || isCapturePending || capturedCount >= TOTAL_SHOTS) return;
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setIsCapturePending(true);
    setCaptureRequestId(requestId);
    socket.emit('update_config', { sessionId, captureRequestId: requestId });
  }, [sessionId, isCapturePending, capturedCount]);

  const acknowledgeCapture = useCallback(() => {
    setIsCapturePending(false);
    setCaptureRequestId(null);
    if (sessionId) {
      socket.emit('update_config', { sessionId, captureRequestId: null });
    }
  }, [sessionId]);

  const registerCapturedPhoto = useCallback((blob: Blob, previewUrl: string, clip?: Blob | null) => {
    // FIX: Guard against double execution
    if (!captureRequestIdRef.current) {
      return;
    }
    const currentRequestId = captureRequestIdRef.current;

    // Calculate assigned slot synchronously using current state
    let assignedSlot = Math.min(capturedCount, TOTAL_SHOTS - 1);

    // Check collision against current rawPhotos state
    if (rawPhotos[assignedSlot] !== null) {
      const fallback = rawPhotos.findIndex(item => item === null);
      if (fallback !== -1) {
        assignedSlot = fallback;
      } else {
        // Full
        assignedSlot = -1;
      }
    }

    if (assignedSlot === -1) {
      captureRequestIdRef.current = null; // Consume ID even if failed
      acknowledgeCapture();
      return;
    }

    // Now we have a firm assignedSlot. use it for EVERYTHING.
    // Consume ID only on success path or handled failure
    captureRequestIdRef.current = null;

    setRawPhotos(prev => {
      const next = [...prev];
      // Double check inside updater? No, we trust our sync calculation because 
      // this function is the ONLY writer during capture sequence usually.
      next[assignedSlot] = blob;
      return next;
    });

    setPhotoPreviews(prev => {
      const next = [...prev];
      next[assignedSlot] = previewUrl;
      return next;
    });

    if (clip) {
      setRawVideoClips(prev => {
        const next = [...prev];
        next[assignedSlot] = clip;
        return next;
      });
    }

    setCapturedCount(prev => {
      const next = Math.min(prev + 1, TOTAL_SHOTS);
      if (next === TOTAL_SHOTS) {
        setStep('SELECTION');
      }
      return next;
    });

    acknowledgeCapture();
    if (sessionId) {
      socket.emit('photo_taken', {
        sessionId,
        image: previewUrl,
        slot: assignedSlot,
        requestId: currentRequestId,
      });
    }
  }, [acknowledgeCapture, sessionId, capturedCount, rawPhotos]);

  const receiveRemotePhoto = useCallback((previewUrl: string, slot?: number) => {
    let targetSlot = typeof slot === 'number' && slot >= 0 && slot < TOTAL_SHOTS ? slot : -1;

    // If no specific slot, find the first empty one from current state
    if (targetSlot === -1) {
      targetSlot = photoPreviews.findIndex(p => p === null);
    }

    if (targetSlot === -1) {
      // Still no slot? We are full or error.
      return;
    }

    setPhotoPreviews(prev => {
      const next = [...prev];
      next[targetSlot] = previewUrl;
      return next;
    });

    setCapturedCount(prev => {
      const next = Math.min(prev + 1, TOTAL_SHOTS);
      if (next === TOTAL_SHOTS) {
        setStep('SELECTION');
      }
      return next;
    });

    setIsCapturePending(false);
  }, [photoPreviews]);

  const togglePhotoSelection = useCallback((index: number) => {
    setSelectedPhotoIndices(prev => {
      const exists = prev.includes(index);
      let updated: number[];
      if (exists) {
        updated = prev.filter(i => i !== index);
      } else {
        if (prev.length >= REQUIRED_SHOTS) {
          return prev;
        }
        updated = [...prev, index].sort((a, b) => a - b);
      }
      if (sessionId) {
        socket.emit('update_config', { sessionId, selectedPhotoIndices: updated });
      }
      return updated;
    });
  }, [sessionId]);

  const confirmSelection = useCallback(() => {
    if (selectedPhotoIndices.length !== REQUIRED_SHOTS) return;
    setStep('REVIEW');
    if (sessionId) {
      socket.emit('update_config', { sessionId, selectedPhotoIndices });
    }
  }, [selectedPhotoIndices, sessionId]);

  const setFrame = useCallback((frameId: string) => {
    setSelectedFrameId(frameId);
    if (sessionId) {
      socket.emit('update_config', { sessionId, selectedFrameId: frameId });
    }
  }, [sessionId]);

  const setFilter = useCallback((filterId: string) => {
    setSelectedFilter(filterId);
    if (sessionId) {
      socket.emit('update_config', { sessionId, selectedFilter: filterId });
    }
  }, [sessionId]);

  useEffect(() => {
    const handleUpdate = (payload: {
      selectedFrameId?: string;
      selectedFilter?: string;
      timerDuration?: number;
      selectedPhotoIndices?: number[];
      captureRequestId?: string | null;
    }) => {
      if (payload.selectedFrameId !== undefined) {
        setSelectedFrameId(payload.selectedFrameId);
      }
      if (payload.selectedFilter !== undefined) {
        setSelectedFilter(payload.selectedFilter);
      }
      if (typeof payload.timerDuration === 'number') {
        setTimerDuration(payload.timerDuration);
        setCapturedCount(0);
        setRawPhotos(Array(TOTAL_SHOTS).fill(null));
        setRawVideoClips(Array(TOTAL_SHOTS).fill(null));
        setPhotoPreviews(Array(TOTAL_SHOTS).fill(null));
        setSelectedPhotoIndices([]);
        setStep('CAPTURE');
      }
      if (payload.selectedPhotoIndices !== undefined) {
        setSelectedPhotoIndices(payload.selectedPhotoIndices);
        if (payload.selectedPhotoIndices.length === REQUIRED_SHOTS) {
          setStep('REVIEW');
        }
      }
      if ('captureRequestId' in payload) {
        const nextRequestId = payload.captureRequestId ?? null;
        setCaptureRequestId(nextRequestId);
        setIsCapturePending(Boolean(nextRequestId));
      }
    };

    socket.on('update_config', handleUpdate);
    return () => {
      socket.off('update_config', handleUpdate);
    };
  }, []);

  useEffect(() => {
    captureRequestIdRef.current = captureRequestId;
  }, [captureRequestId]);

  const value = useMemo<BoothContextType>(() => ({
    sessionId,
    setSessionId,
    timerDuration,
    step,
    totalShots: TOTAL_SHOTS,
    requiredShots: REQUIRED_SHOTS,
    capturedCount,
    rawPhotos,
    rawVideoClips,
    photoPreviews,
    selectedPhotoIndices,
    selectedFrameId,
    selectedFilter,
    captureRequestId,
    isCapturePending,
    isProcessing,
    setTimer,
    takeShot,
    registerCapturedPhoto,
    receiveRemotePhoto,
    togglePhotoSelection,
    confirmSelection,
    acknowledgeCapture,
    setFrame,
    setFilter,
    setStep,
    setProcessing: setIsProcessing,
    resetSession,
  }), [
    sessionId,
    timerDuration,
    step,
    capturedCount,
    rawPhotos,
    rawVideoClips,
    photoPreviews,
    selectedPhotoIndices,
    selectedFrameId,
    selectedFilter,
    captureRequestId,
    isCapturePending,
    isProcessing,
    setTimer,
    takeShot,
    registerCapturedPhoto,
    receiveRemotePhoto,
    togglePhotoSelection,
    confirmSelection,
    acknowledgeCapture,
    setFrame,
    setFilter,
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
