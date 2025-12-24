import React from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, RefreshCcw } from 'lucide-react';

interface QRCodeResultProps {
    url: string;
    onReset?: () => void;
}

export const QRCodeResult: React.FC<QRCodeResultProps> = ({ url, onReset }) => {
    return (
        <Card className="w-full max-w-sm mx-auto shadow-xl border-2 border-primary/20 animate-in fade-in zoom-in duration-500">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">Your Photo is Ready!</CardTitle>
                <CardDescription>Scan the QR code to download</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col items-center justify-center space-y-6">
                <div className="p-4 bg-white rounded-xl shadow-inner">
                    <QRCode
                        value={url}
                        size={200}
                        viewBox={`0 0 256 256`}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    />
                </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
                <Button className="w-full" asChild>
                    <a href={url} target="_blank" rel="noreferrer">
                        <Download className="mr-2 h-4 w-4" /> Open Link
                    </a>
                </Button>
                {onReset && (
                    <Button variant="outline" onClick={onReset} className="w-full">
                        <RefreshCcw className="mr-2 h-4 w-4" /> Start New Session
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};
