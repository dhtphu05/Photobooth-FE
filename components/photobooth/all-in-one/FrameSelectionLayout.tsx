import { useEffect } from 'react';
import { useBooth } from '@/context/BoothContext';
import { Button } from '@/components/ui/button';
import { useCreateSession } from '@/api/endpoints/sessions/sessions';

// Reuse FRAME_OPTIONS from config/constants if available, or define here for now
const FRAME_OPTIONS = [
    { id: 'frame-danang', label: 'Đà Nẵng', image: '/frame-da-nang.png' },
    { id: 'frame-bao-xuan', label: 'Báo Xuân', image: '/frame-bao-xuan.png' },
    { id: 'frame-chuyen-tau', label: 'Chuyến tàu', image: '/frame-chuyen-tau-thanh-xuan.png' },
    { id: 'frame-final-1', label: 'Final 1', image: '/frame-final.png' },
    { id: 'frame-cuoi-1', label: 'Cuối 1', image: '/frame-cuoi-1.png' },
    { id: 'frame-cuoi-2', label: 'Cuối 2', image: '/frame-cuoi-2.png' },
    { id: 'frame-cuoi-3', label: 'Cuối 3', image: '/frame-cuoi-3.png' },
    { id: 'frame-quan-su', label: 'Quân sự', image: '/frame-quan-su.png' },
    { id: 'frame-lich-xanh-duong', label: 'Lịch xanh dương', image: '/frame-lich-xanh-duong.png' },
    { id: 'frame-lich-hong', label: 'Lịch hồng', image: '/frame-lich-hong.png' },
    { id: 'frame-lich-xanh', label: 'Lịch xanh', image: '/frame-lich-xanh.png' },
    { id: 'frame-lich-xam', label: 'Lịch xám', image: '/frame-lich-xam.png' },
    { id: 'frame-lich-den', label: 'Lịch đen', image: '/frame-lich-den.png' },
    { id: 'frame-xtn', label: "Xuân tình nguyện", image: '/frame-xtn.png' },
];

export const FrameSelectionLayout = () => {
    const { selectedFrameId, setFrame, setStep, resetSession, setSessionId } = useBooth();
    const { mutate: createSession, isPending } = useCreateSession();

    // Auto-create session on mount if not exists logic is handled in container
    useEffect(() => {
        resetSession();
    }, [resetSession]); // Dependency on resetSession which is stable

    // Handle selection and session creation
    const handleConfirm = () => {
        // Create session on server to ensure valid ID for upload
        createSession({
            data: {
                type: 'PHOTOBOOTH'
            }
        }, {
            onSuccess: (data) => {
                const newId = data.data.id;
                setSessionId(newId);
                setStep('CONFIG');
            },
            onError: (err) => {
                console.error("Failed to create session", err);
                // Fallback to local timestamp ID if server fails, though upload will fail later
                const fallbackId = `local-fallback-${Date.now()}`;
                setSessionId(fallbackId);
                setStep('CONFIG');
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 p-6">
            <div className="mb-6 text-center space-y-2">
                <h1 className="text-3xl font-bold uppercase tracking-wide text-gray-900">1. Chọn Khung Ảnh</h1>
                <p className="text-muted-foreground">Chạm vào khung bạn thích để chọn</p>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 pb-20">
                    {FRAME_OPTIONS.filter(frame => {
                        if (frame.id === 'frame-final-1') {
                            // Logic ẩn hiện theo thời gian
                            const now = new Date();
                            const startTime = new Date('2025-12-31T09:40:00+07:00');
                            const endTime = new Date('2025-12-31T11:45:00+07:00');
                            return now >= startTime && now <= endTime;
                        }
                        return true;
                    }).map(frame => (
                        <button
                            key={frame.id}
                            onClick={() => setFrame(frame.id)}
                            className={`relative group rounded-xl overflow-hidden aspect-[2480/3508] transition-all duration-300 ${selectedFrameId === frame.id
                                ? 'ring-4 ring-black shadow-2xl scale-[1.02]'
                                : 'ring-1 ring-gray-200 hover:ring-2 hover:ring-gray-300 hover:scale-[1.01]'
                                }`}
                        >
                            <img src={frame.image} alt={frame.label} className="w-full h-full object-cover" />
                            {selectedFrameId === frame.id && (
                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                    <div className="bg-black text-white rounded-full p-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white p-3 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                {frame.label}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 flex justify-center z-50">
                <Button
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="w-full max-w-md h-16 text-xl font-bold rounded-2xl shadow-xl bg-black hover:bg-gray-800 text-white transition-all transform hover:scale-105"
                >
                    {isPending ? <span className="animate-spin mr-2">⏳</span> : null}
                    {isPending ? 'Đang khởi tạo...' : 'Xác Nhận & Tiếp Tục'}
                </Button>
            </div>
        </div>
    );
};
