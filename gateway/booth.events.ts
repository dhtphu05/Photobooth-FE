type UpdateConfigPayload = {
    sessionId: string;
    selectedFrameId?: string;
    selectedFilter?: string;
    timerDuration?: number;
    selectedPhotoIndices?: number[];
    captureRequestId?: string | null;
};

type ServerConfigBroadcast = Omit<UpdateConfigPayload, 'sessionId'>;

export interface ClientToServerEvents {
    join: (sessionId: string) => void;
    update_config: (payload: UpdateConfigPayload) => void;
    trigger_finish: (sessionId: string) => void;
    photo_taken: (payload: { sessionId: string; image: string; slot?: number; requestId?: string | null }) => void;
    processing_start: (sessionId: string) => void;
    processing_done: (sessionId: string) => void;
}

export interface ServerToClientEvents {
    update_config: (payload: ServerConfigBroadcast) => void;
    trigger_finish: () => void;
    photo_taken: (payload: { image: string; slot?: number; requestId?: string | null }) => void;
    processing_start: () => void;
    processing_done: () => void;
}
