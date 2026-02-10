'use client';

import { useRef } from 'react';
import Webcam from 'react-webcam';
import { BoothProvider, useBooth } from '@/context/BoothContext';

// Import extracted components
import { FrameSelectionLayout } from '@/components/photobooth/all-in-one/FrameSelectionLayout';
import { ConfigLayout } from '@/components/photobooth/all-in-one/ConfigLayout';
import { CaptureLayout } from '@/components/photobooth/all-in-one/CaptureLayout';
import { SelectionLayout } from '@/components/photobooth/all-in-one/SelectionLayout';
import { ReviewLayout } from '@/components/photobooth/all-in-one/ReviewLayout';
import { CompletedLayout } from '@/components/photobooth/all-in-one/CompletedLayout';

const VIDEO_CONSTRAINTS = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    aspectRatio: 1.777777778, // 16:9
    facingMode: 'user',
};

const AllInOneContent = () => {
    const { step } = useBooth();
    const webcamRef = useRef<Webcam>(null);

    // Step Router
    const renderStep = () => {
        switch (step) {
            case 'FRAME_SELECTION':
                return <FrameSelectionLayout />;
            case 'CONFIG':
                return <ConfigLayout webcamRef={webcamRef} />;
            case 'CAPTURE':
                return <CaptureLayout webcamRef={webcamRef} />;
            case 'SELECTION':
                return <SelectionLayout />;
            case 'REVIEW':
                return <ReviewLayout />;
            case 'COMPLETED':
                return <CompletedLayout />;
            default:
                return <FrameSelectionLayout />;
        }
    };

    // Determine if we should show the persistent webcam layer
    // We keep it mounted ALWAYS to prevent stream loss, but toggle visibility/z-index
    const showWebcam = step === 'CONFIG' || step === 'CAPTURE';

    return (
        <div className="relative w-full h-screen overflow-hidden text-gray-900 bg-white font-sans bg-black">

            {/* 1. LAYER: Persistent Webcam (Background) */}
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${showWebcam ? 'opacity-100' : 'opacity-0 delay-500'}`}>
                {/* 
                   Match the layout logic of CaptureLayout/ConfigLayout:
                   Centered, 16:9 aspect ratio, maximizing viewport.
                */}
                <div className="relative w-full max-w-[177.78vh] aspect-video overflow-hidden">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={VIDEO_CONSTRAINTS}
                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                        forceScreenshotSourceSize={true}
                    />
                </div>
            </div>

            {/* 2. LAYER: UI / Layouts (Foreground) */}
            <div className="absolute inset-0 z-10 w-full h-full">
                {renderStep()}
            </div>
        </div>
    );
};

export default function AllInOnePage() {
    return (
        <BoothProvider mode="local">
            <AllInOneContent />
        </BoothProvider>
    );
}
