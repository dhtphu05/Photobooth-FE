export interface ClientToServerEvents {
    join: (roomId: string) => void;
    update_state: (payload: { selectedFilter?: string; selectedFrame?: string }) => void;
    trigger_countdown: (roomId: string) => void;
}

export interface ServerToClientEvents {
    state_updated: (payload: { selectedFilter?: string; selectedFrame?: string }) => void;
    start_countdown: () => void;
    show_result: (payload: { imageUrl: string }) => void;
}
