import { useRef, useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { useBooth } from '@/context/BoothContext';
import { Button } from '@/components/ui/button';
import { useUploadSessionMedia } from '@/api/endpoints/sessions/sessions';
import { useStripComposer } from '@/hooks/useStripComposer';

const FILTER_OPTIONS = [
    { id: 'normal', label: 'Original' },
    { id: 'bw', label: 'B&W' },
    { id: 'sepia', label: 'Sepia' },
];

const FILTER_CLASS_MAP: Record<string, string> = {
    normal: '',
    bw: 'grayscale',
    sepia: 'sepia',
};

// Default max words if not config loaded
// const DEFAULT_MAX_WORDS = 10; // This constant is removed as per instruction

export const ReviewLayout = () => {
    const {
        customMessage, setCustomMessage,
        selectedFilter, setFilter,
        setStep, isProcessing,
        setProcessing,
        selectedFrameId,
        rawPhotos,
        selectedPhotoIndices
    } = useBooth();

    const [isError, setIsError] = useState(false);

    // Simplification: We don't import full config here to avoid circular dep or heavy load if not needed
    // But ideally we should. For now use default or simple logic.
    // const maxWords = DEFAULT_MAX_WORDS; // This line is changed as per instruction
    const maxWords = 10;

    // --- Message Validation ---
    useEffect(() => {
        const words = customMessage.trim().split(/\s+/).filter(w => w.length > 0);
        setIsError(words.length > maxWords);
    }, [customMessage, maxWords]);
    // -------------------------

    // Generate Preview
    const { previewUrl, isThinking } = useStripComposer({
        uniqueId: `${selectedFrameId}-${selectedFilter}-${customMessage}`,
        rawPhotos,
        selectedPhotoIndices,
        selectedFrameId,
        selectedFilter,
        customMessage,
        enabled: true
    });

    const handleFinish = async () => {
        setProcessing(true);
        setStep('COMPLETED');
        // Actual processing happens in CompletedLayout or we trigger it now
    };

    return (
        <div className="flex h-full bg-gray-50 ">
            {/* Left/Center: Final Preview Mockup */}
            <div className="flex-1 bg-gray-200/50 flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/bg-pattern.png')] opacity-5"></div>

                {isThinking ? (
                    <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
                        <p className="text-gray-500 font-medium">Đang áp dụng hiệu ứng...</p>
                    </div>
                ) : (
                    <div className="relative bg-white shadow-2xl rounded-sm p-2 transform transition-all duration-300 hover:scale-[1.02] max-h-full">
                        {previewUrl ? (
                            <img src={previewUrl} className="max-h-[80vh] w-auto object-contain border border-gray-100" />
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
                <h2 className="text-3xl font-bold mb-8">Chỉnh sửa cuối</h2>

                {/* 1. Filter */}
                <div className="mb-10">
                    <label className="block text-sm font-bold text-gray-900 icon-label mb-3">
                        <Camera className="w-4 h-4 inline mr-2" />
                        Bộ Lọc Màu
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {FILTER_OPTIONS.map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setFilter(filter.id)}
                                className={`py-4 rounded-xl font-medium transition-all ${selectedFilter === filter.id
                                    ? 'bg-black text-white shadow-lg scale-105'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Message */}
                <div className="mb-10">
                    <label className="block text-sm font-bold text-gray-900 icon-label mb-3">
                        <span className="mr-2">📝</span>
                        Lời nhắn của bạn
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={customMessage}
                            onChange={e => setCustomMessage(e.target.value)}
                            placeholder="Nhập tên, ngày tháng..."
                            className={`w-full p-4 rounded-xl border-2 bg-gray-50 text-lg transition-colors outline-none ${isError ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'
                                }`}
                        />
                        <div className={`text-xs mt-2 text-right font-medium ${isError ? 'text-red-500' : 'text-gray-400'}`}>
                            {customMessage.trim().split(/\s+/).filter(w => w.length > 0).length}/{maxWords} từ
                        </div>
                    </div>
                </div>

                {/* 3. Finish Action */}
                <div className="mt-auto">
                    <Button
                        onClick={handleFinish}
                        disabled={isError || isProcessing}
                        className="w-full h-20 text-xl font-bold rounded-2xl shadow-xl"
                    >
                        {isProcessing ? 'Đang xử lý...' : 'Hoàn Thành & In Ảnh'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
