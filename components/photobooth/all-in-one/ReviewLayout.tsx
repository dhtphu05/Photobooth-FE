import { useRef, useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { useBooth } from '@/context/BoothContext';
import { Button } from '@/components/ui/button';
import { useUploadSessionMedia } from '@/api/endpoints/sessions/sessions';
import { useStripComposer } from '@/hooks/useStripComposer';
import { getLayoutConfig } from '@/app/config/layouts';

export const ReviewLayout = () => {
    const {
        customMessage, setCustomMessage,
        selectedFilter, setFilter, // Keeping for context compatibility but not using UI
        setStep, isProcessing,
        setProcessing,
        selectedFrameId,
        rawPhotos,
        selectedPhotoIndices
    } = useBooth();

    const [isError, setIsError] = useState(false);

    // --- Local Input State for Debouncing ---
    const [inputValue, setInputValue] = useState(customMessage);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const maxWords = 10;
    const layoutConfig = getLayoutConfig(selectedFrameId);
    const shouldShowMessageInput = layoutConfig.showTextOverlay !== false;

    // Sync external customMessage to local input (initial load or external change)
    useEffect(() => {
        setInputValue(customMessage);
    }, [customMessage]);

    // Update global customMessage with debounce when local input changes
    const handleInputChange = (val: string) => {
        setInputValue(val);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            setCustomMessage(val);
        }, 800); // 800ms wait before regenerating strip
    };

    // --- Message Validation ---
    useEffect(() => {
        const words = inputValue.trim().split(/\s+/).filter(w => w.length > 0);
        setIsError(words.length > maxWords);
    }, [inputValue, maxWords]);
    // -------------------------

    // Generate Preview
    const { previewUrl, isThinking } = useStripComposer({
        uniqueId: `${selectedFrameId}-${selectedFilter}-${customMessage}`, // Depends on DEBOUNCED customMessage
        rawPhotos,
        selectedPhotoIndices,
        selectedFrameId,
        selectedFilter,
        customMessage, // Uses DEBOUNCED value
        enabled: true
    });

    const handleFinish = async () => {
        setProcessing(true);
        setStep('COMPLETED');
        // Actual processing happens in CompletedLayout or we trigger it now
    };

    return (
        <div className="flex h-full bg-white">
            {/* Left/Center: Final Preview Mockup */}
            <div className="flex-1 bg-gray-100 flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/bg-pattern.png')] opacity-5"></div>

                {isThinking ? (
                    <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
                        <p className="text-gray-500 font-medium">Đang tạo bản in...</p>
                    </div>
                ) : (
                    <div className="relative bg-white shadow-2xl rounded-sm p-2 transform transition-all duration-300 hover:scale-[1.02] max-h-full">
                        {previewUrl ? (
                            <img src={previewUrl} className="max-h-[85vh] w-auto object-contain border border-gray-100" />
                        ) : (
                            <div className="w-[300px] h-[500px] bg-white flex items-center justify-center text-gray-400">
                                Không thể tải xem trước
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Controls Panel */}
            <div className="w-full max-w-md bg-white border-l border-gray-200 flex flex-col p-8 z-10 shadow-xl">
                <div className="mb-8 text-center pt-8">
                    <h2 className="text-3xl font-bold mb-2">Chỉnh sửa cuối</h2>
                    <p className="text-gray-500">
                        {shouldShowMessageInput ? 'Thêm lời nhắn cho bức ảnh của bạn' : 'Kiểm tra lại bố cục trước khi in ảnh'}
                    </p>
                </div>

                {/* Message Input */}
                {shouldShowMessageInput ? (
                    <div className="mb-10">
                        <label className="block text-lg font-bold text-gray-900 icon-label mb-3">
                            <span className="mr-2">📝</span>
                            Lời nhắn
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={e => handleInputChange(e.target.value)}
                                placeholder="Nhập tên, ngày tháng..."
                                className={`w-full p-6 rounded-2xl border-2 bg-gray-50 text-xl transition-colors outline-none ${isError ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'
                                    }`}
                            />
                            <div className={`text-sm mt-3 text-right font-medium ${isError ? 'text-red-500' : 'text-gray-400'}`}>
                                {inputValue.trim().split(/\s+/).filter(w => w.length > 0).length}/{maxWords} từ
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                        Frame này không hiển thị thời gian hoặc lời nhắn, nên bản in sẽ giữ nguyên bố cục của mẫu báo.
                    </div>
                )}

                {/* Finish Action */}
                <div className="mt-auto pb-8">
                    <Button
                        onClick={handleFinish}
                        disabled={isError || isProcessing}
                        className="w-full h-20 text-xl font-bold rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 bg-black text-white hover:bg-gray-800"
                    >
                        {isProcessing ? 'Đang xử lý...' : 'Hoàn Thành & In Ảnh'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
