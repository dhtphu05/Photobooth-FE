
export interface DailyStat {
    date: string;
    count: number;
}

export interface HourlyStat {
    hour: string;
    count: number;
}

export interface AdminStats {
    totalSessions: number;
    totalPhotos: number;
    completedSessions: number;
    sessionsByDay: DailyStat[];
    sessionsByHour: HourlyStat[];
}
