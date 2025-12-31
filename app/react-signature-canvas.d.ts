declare module 'react-signature-canvas' {
    import * as React from 'react';

    export interface SignatureCanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
        velocityFilterWeight?: number;
        minWidth?: number;
        maxWidth?: number;
        minDistance?: number;
        dotSize?: number | (() => number);
        penColor?: string;
        backgroundColor?: string;
        onEnd?: () => void;
        onBegin?: () => void;
        canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
        clearOnResize?: boolean;
    }

    export default class SignatureCanvas extends React.Component<SignatureCanvasProps> {
        clear(): void;
        isEmpty(): boolean;
        fromDataURL(base64String: string, options?: any): void;
        toDataURL(mimetype?: string, encoderOptions?: number): string;
        fromData(pointGroups: any[]): void;
        toData(): any[];
        off(): void;
        on(): void;
        getCanvas(): HTMLCanvasElement;
        getTrimmedCanvas(): HTMLCanvasElement;
    }
}
