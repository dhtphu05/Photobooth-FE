'use client';

import { useRef, useState } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';
import { Eraser, Check, X, RefreshCcw, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SigningStepProps {
    onConfirm: (signatureData: string) => void;
    isProcessing: boolean;
}

const PEN_COLORS = [
    { id: 'black', value: '#000000', label: 'Black' },
    { id: 'white', value: '#ffffff', label: 'White' },
    { id: 'neon-pink', value: '#ff0099', label: 'Pink' },
    { id: 'neon-blue', value: '#00f3ff', label: 'Blue' },
    { id: 'neon-green', value: '#0aff00', label: 'Green' },
];

export const SigningStep = ({ onConfirm, isProcessing }: SigningStepProps) => {
    const sigPadRef = useRef<ReactSignatureCanvas>(null);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [isEmpty, setIsEmpty] = useState(true);

    const clear = () => {
        sigPadRef.current?.clear();
        setIsEmpty(true);
    };

    const handleEnd = () => {
        if (sigPadRef.current) {
            setIsEmpty(sigPadRef.current.isEmpty());
        }
    };

    const confirm = () => {
        if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
            // Get signature as base64 PNG (transparent background)
            const dataUrl = sigPadRef.current.toDataURL('image/png');
            onConfirm(dataUrl);
        } else {
            // If empty, maybe just confirm with no signature? 
            // Requirement says "Confirm / Skip", so empty means skip effectively or empty string.
            // Let's pass empty string if empty, or handle it in parent.
            // But typically toDataURL returns a blank image if empty.
            // Let's force user to explicitly clear or draw. 
            // If they want to skip, we can have a skip button or just allow confirming empty.
            // For now, let's assume confirm sends whatever is on canvas.
            const dataUrl = sigPadRef.current?.toDataURL('image/png') || '';
            onConfirm(dataUrl);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold">Ký tên / Vẽ vời</h2>
                <p className="text-muted-foreground">Thêm dấu ấn cá nhân của bạn vào ảnh nhé!</p>
            </div>

            <div className="flex flex-col items-center space-y-4">
                {/* Drawing Area */}
                <div className="border-4 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white/50 relative shadow-sm">
                    <ReactSignatureCanvas
                        ref={sigPadRef}
                        penColor={selectedColor}
                        canvasProps={{
                            width: 500,
                            height: 300,
                            className: 'cursor-crosshair bg-transparent',
                        }}
                        onEnd={handleEnd}
                        minWidth={2}
                        maxWidth={5}
                        velocityFilterWeight={0.7}
                    />
                    <div className="absolute top-2 right-2 text-xs text-black/20 pointer-events-none font-medium uppercase tracking-widest">
                        Drawing Area
                    </div>
                </div>

                {/* Tools */}
                <div className="flex items-center gap-4 bg-white p-2 rounded-full shadow-md border border-gray-100">
                    {PEN_COLORS.map((color) => (
                        <button
                            key={color.id}
                            onClick={() => setSelectedColor(color.value)}
                            className={`w-10 h-10 rounded-full border-2 transition-transform ${selectedColor === color.value
                                ? 'scale-110 border-gray-900 shadow-sm'
                                : 'hover:scale-105 border-transparent'
                                }`}
                            style={{ backgroundColor: color.value }}
                            title={color.label}
                            aria-label={`Select ${color.label}`}
                        />
                    ))}
                    <div className="w-px h-8 bg-gray-200 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={clear}
                        className="rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50"
                        title="Clear"
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex gap-4 max-w-lg mx-auto">
                <Button
                    variant="outline"
                    className="flex-1 h-16 text-xl font-medium rounded-xl border-2"
                    onClick={() => onConfirm('')} // Skip
                    disabled={isProcessing}
                >
                    Bỏ Qua
                </Button>

                <Button
                    onClick={confirm}
                    disabled={isProcessing}
                    className="flex-1 h-16 text-xl font-bold rounded-xl shadow-lg bg-black text-white hover:bg-gray-900"
                >
                    {isProcessing ? 'Đang xử lý...' : 'Xác Nhận'}
                    {!isProcessing && <Check className="w-6 h-6 ml-2" />}
                </Button>
            </div>
        </div>
    );
};
