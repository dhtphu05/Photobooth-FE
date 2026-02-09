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
                // Pass minimal props if needed or let component access context
                return <ReviewLayout />;
            // SIGNING SKIPPED
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
