import Webcam from 'react-webcam';
import { useBooth } from '@/context/BoothContext';

const TIMER_OPTIONS = [5, 7, 10];

interface ConfigLayoutProps {
    webcamRef: React.RefObject<Webcam>;
}

export const ConfigLayout = ({ webcamRef }: ConfigLayoutProps) => {
    const { setTimer } = useBooth();

    return (
        <div className="flex flex-col h-full bg-transparent text-white relative">
            {/* Camera Area Placeholder - Transparent so global webcam shows through */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                {/*  
                    Matches the parent's container structure for alignment, 
                    but just holds the Overlay Text now.
                 */}
                <div className="relative w-full max-w-[177.78vh] aspect-video shadow-2xl overflow-hidden">

                    {/* Overlay Text */}
                    <div className="absolute top-8 left-0 right-0 text-center pointer-events-none z-10">
                        <h2 className="text-4xl font-bold drop-shadow-lg uppercase tracking-widest text-white/90">Sẵn sàng chưa?</h2>
                    </div>
                </div>
            </div>

            {/* Config Controls - Floating Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20 z-20">
                <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
                    <p className="text-xl font-medium text-gray-200">Chọn thời gian đếm ngược giữa các lần chụp:</p>
                    <div className="flex gap-6 w-full justify-center">
                        {TIMER_OPTIONS.map(time => (
                            <button
                                key={time}
                                onClick={() => setTimer(time)}
                                className="group relative flex flex-col items-center justify-center w-32 h-32 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-3xl hover:bg-white hover:text-black transition-all duration-300 hover:scale-110 active:scale-95"
                            >
                                <span className="text-5xl font-black mb-1">{time}s</span>
                                <span className="text-xs uppercase tracking-widest opacity-70 font-semibold group-hover:opacity-100">Bắt đầu</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
