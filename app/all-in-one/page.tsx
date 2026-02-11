'use client';

import { useRef } from 'react';
import Webcam from 'react-webcam';
import { BoothProvider, useBooth } from '@/context/BoothContext';

// Import extracted components
import { FrameSelectionLayout } from '@/components/photobooth/all-in-one/FrameSelectionLayout';
import { CaptureLayout } from '@/components/photobooth/all-in-one/CaptureLayout'; // Functions as Config + Capture
import { SelectionLayout } from '@/components/photobooth/all-in-one/SelectionLayout';
import { ReviewLayout } from '@/components/photobooth/all-in-one/ReviewLayout';
import { CompletedLayout } from '@/components/photobooth/all-in-one/CompletedLayout';

const AllInOneContent = () => {
    const { step } = useBooth();
    // We keep ref here to maintain it if needed, or we can move it inside CaptureLayout if it fully owns it.
    // However, if we want to support transition out of CaptureLayout (e.g. to Selection) and back?
    // Actually, Selection step doesn't use camera normally. 
    // So keeping ref here is fine, but CaptureLayout will render the Webcam.
    const webcamRef = useRef<Webcam>(null);

    // Step Router
    const renderStep = () => {
        switch (step) {
            case 'FRAME_SELECTION':
                return <FrameSelectionLayout />;

            // BOTH Config (Timer) and Capture steps use the Unified CaptureLayout
            case 'CONFIG':
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

    return (
        <div className="w-full h-screen overflow-hidden text-gray-900 bg-white font-sans">
            {renderStep()}
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
