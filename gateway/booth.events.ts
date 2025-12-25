type CaptureDonePayload = {
    roomId: string;
    imageUrl?: string;
    videoUrl?: string;
    shotIndex?: number;
};

type ShowResultPayload = {
    roomId?: string;
    imageUrl?: string;
    videoUrl?: string;
    previewReady?: boolean;
};

export interface ClientToServerEvents {
    join: (roomId: string) => void;
    update_state: (payload: { selectedFilter?: string; selectedFrame?: string }) => void;
    trigger_countdown: (roomId: string) => void;
    capture_done: (payload: CaptureDonePayload) => void;
    show_result: (payload: ShowResultPayload) => void;
}

export interface ServerToClientEvents {
    state_updated: (payload: { selectedFilter?: string; selectedFrame?: string }) => void;
    start_countdown: () => void;
    show_result: (payload: ShowResultPayload) => void;
    capture_done: (payload: CaptureDonePayload) => void;
}
