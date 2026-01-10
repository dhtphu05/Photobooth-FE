export interface Slot {
    x: number; // Percentage 0-1
    y: number; // Percentage 0-1
    w: number; // Percentage 0-1
    h: number; // Percentage 0-1
}

export interface ExportConfig {
    TOP_OFFSET_PERCENT: number;
    FONT_SCALE: number;
}

export interface TextOverlayConfig {
    TOP_PERCENT: number;
    LEFT_PERCENT: number;
    WIDTH_PERCENT: number;
    FONT_SIZE_PERCENT: number;
    ALIGN: CanvasTextAlign;
    FONT_FAMILY: string;
    FONT_STYLE?: string; // 'normal' | 'italic' | 'bold' etc.
    MAX_WORDS?: number;
}

export interface OverlayConfig {
    TIMESTAMP: TextOverlayConfig;
    MESSAGE: TextOverlayConfig;
    EXPORT_CONFIG: ExportConfig;
}

export interface LayoutConfig {
    frameId: string;
    photoCount: number; // Number of selected photos to print
    captureCount: number; // Total shots to capture depending on frame
    slots: Slot[];
    overlay?: OverlayConfig; // Optional overlay config, fallback to default if missing
}

export const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
    TIMESTAMP: {
        TOP_PERCENT: 0.165,
        LEFT_PERCENT: 0.000001,
        WIDTH_PERCENT: 0.26,
        FONT_SIZE_PERCENT: 0.01,
        ALIGN: 'center',
        FONT_FAMILY: '"Courier New", Courier, monospace',
        FONT_STYLE: 'normal',
    },
    MESSAGE: {
        TOP_PERCENT: 0.165,
        LEFT_PERCENT: 0.35,
        WIDTH_PERCENT: 0.145,
        FONT_SIZE_PERCENT: 0.011,
        ALIGN: 'center',
        FONT_FAMILY: '"Courier New", Courier, monospace',
        FONT_STYLE: 'normal',
    },
    EXPORT_CONFIG: {
        TOP_OFFSET_PERCENT: 0.002,
        FONT_SCALE: 1.5,
    }
};

export const DEFAULT_LAYOUT: LayoutConfig = {
    frameId: 'default',
    photoCount: 3,
    captureCount: 6,
    slots: [
        { x: 0.038, y: 0.195, w: 0.924, h: 0.365 },
        { x: 0.038, y: 0.580, w: 0.445, h: 0.175 },
        { x: 0.515, y: 0.770, w: 0.445, h: 0.175 },
    ],
    overlay: DEFAULT_OVERLAY_CONFIG,
};

export const LAYOUTS: Record<string, LayoutConfig> = {
    'frame-lich-xanh-duong': {
        frameId: 'frame-lich-xanh-duong',
        photoCount: 2,
        captureCount: 4,
        slots: [
            { x: 0.032, y: 0.190, w: 0.450, h: 0.195 }, // Left Frame
            { x: 0.512, y: 0.190, w: 0.450, h: 0.195 }, // Right Frame
        ],
        overlay: {
            ...DEFAULT_OVERLAY_CONFIG,
            // Customizable override for this frame
            TIMESTAMP: {
                ...DEFAULT_OVERLAY_CONFIG.TIMESTAMP,
                // Example: Shift right slightly if needed (as per user hint)
                LEFT_PERCENT: 0.17,
                FONT_FAMILY: '"SVN-Linux-Libertine", serif',
                FONT_STYLE: 'italic',

            },
            MESSAGE: {
                ...DEFAULT_OVERLAY_CONFIG.MESSAGE,
                LEFT_PERCENT: 0.5,
                WIDTH_PERCENT: 0.25,
                TOP_PERCENT: 0.164,

                FONT_FAMILY: '"SVN-Linux-Libertine", serif',
                FONT_STYLE: 'italic',
                MAX_WORDS: 22,
            },
        }
    },
    // Default fallback for other frames that need 3 photos
    'default_3_photo': {
        frameId: 'default_3_photo',
        photoCount: 3,
        captureCount: 6,
        slots: [
            // Previous default slots
            { x: 0.038, y: 0.195, w: 0.924, h: 0.365 },
            { x: 0.038, y: 0.580, w: 0.445, h: 0.175 },
            { x: 0.515, y: 0.770, w: 0.445, h: 0.175 },
        ],
        overlay: DEFAULT_OVERLAY_CONFIG,
    },
};

export const getLayoutConfig = (frameId: string): LayoutConfig => {
    if (LAYOUTS[frameId]) {
        return LAYOUTS[frameId];
    }
    // Default behavior for existing frames that expect 3 photos
    return {
        ...DEFAULT_LAYOUT,
        overlay: DEFAULT_OVERLAY_CONFIG,
        frameId: frameId,
    };
};
