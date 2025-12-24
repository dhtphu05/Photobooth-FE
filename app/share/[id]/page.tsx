'use client';

import { useGetSession } from '@/api/endpoints/sessions/sessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { use } from 'react';
import { Download, Share2 } from 'lucide-react';

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const { data: response, isLoading, isError } = useGetSession(id);
    const session = response?.data;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-pulse text-lg font-medium text-gray-500">Loading your memories...</div>
            </div>
        );
    } // added closing brace

    if (isError || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-lg font-medium text-red-500">Session not found or expired.</div>
            </div>
        );
    }

    const photos = session.medias?.filter(m => m.type === 'ORIGINAL') || [];
    const videos = session.medias?.filter(m => m.type === 'VIDEO') || [];

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-md mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-center">Your Photobooth Session</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {photos.map((photo) => (
                            <div key={photo.id} className="space-y-2">
                                <h3 className="font-medium text-sm text-muted-foreground">Photo</h3>
                                <div className="rounded-lg overflow-hidden border bg-white">
                                    <img src={photo.url} alt="Session Photo" className="w-full h-auto" />
                                </div>
                                <Button className="w-full" variant="outline" asChild>
                                    <a href={photo.url} download target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-4 w-4" /> Download Photo
                                    </a>
                                </Button>
                            </div>
                        ))}

                        {videos.map((video) => (
                            <div key={video.id} className="space-y-2">
                                <h3 className="font-medium text-sm text-muted-foreground">Video Recap</h3>
                                <div className="rounded-lg overflow-hidden border bg-black aspect-video flex items-center justify-center">
                                    <video src={video.url} controls className="w-full h-full" />
                                </div>
                                <Button className="w-full" variant="outline" asChild>
                                    <a href={video.url} download target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-4 w-4" /> Download Video
                                    </a>
                                </Button>
                            </div>
                        ))}

                        {photos.length === 0 && videos.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                                No media uploaded yet.
                            </div>
                        )}

                        <div className="pt-4 border-t text-center">
                            <p className="text-xs text-muted-foreground mb-2">Share this page</p>
                            <Button variant="secondary" size="sm" onClick={() => {
                                navigator.share?.({
                                    title: 'My Photobooth Session',
                                    url: window.location.href
                                }).catch(() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    alert('Link copied to clipboard!');
                                });
                            }}>
                                <Share2 className="mr-2 h-3 w-3" /> Share Link
                            </Button>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
