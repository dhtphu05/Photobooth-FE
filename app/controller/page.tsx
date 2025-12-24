'use client';

import { useState, useEffect } from 'react';
import { useCreateSession } from '@/api/endpoints/sessions/sessions';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ControllerPage() {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [filter, setFilter] = useState('original');
    const [frame, setFrame] = useState('none');
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const { mutate: createSession, isPending: isCreating } = useCreateSession();

    const handleStartSession = () => {
        // Determine what CreateSessionDto requires. Assuming empty object is fine or minimally required fields.
        // Based on guide: "Call createSession()".
        createSession({ data: {} as any }, { // using as any to bypass strict check for now, can refine if needed
            onSuccess: (response) => {
                // response.data is the Session object
                const newSessionId = response.data.id;
                if (newSessionId) {
                    setSessionId(newSessionId);
                    socket.connect();
                    socket.emit('join', newSessionId);
                }
            }
        });
    };

    const handleUpdateConfig = (newFilter: string, newFrame: string) => {
        setFilter(newFilter);
        setFrame(newFrame);

        if (sessionId) {
            socket.emit('update_state', { selectedFilter: newFilter, selectedFrame: newFrame });
        }
    };

    const handleTakePhoto = () => {
        if (sessionId) {
            socket.emit('trigger_countdown', sessionId);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">Photobooth Controller</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!sessionId ? (
                        <div className="text-center space-y-4">
                            <p className="text-muted-foreground">Start a new session to begin</p>
                            <Button onClick={handleStartSession} disabled={isCreating} className="w-full">
                                {isCreating ? 'Creating...' : 'Start Session'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-muted p-3 rounded-lg text-center">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session ID</p>
                                <p className="font-mono text-sm truncate">{sessionId}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Filter</label>
                                <Select value={filter} onValueChange={(val) => handleUpdateConfig(val, frame)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="original">Original</SelectItem>
                                        <SelectItem value="bw">Black & White</SelectItem>
                                        <SelectItem value="sepia">Sepia</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Frame</label>
                                <Select value={frame} onValueChange={(val) => handleUpdateConfig(filter, val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="holiday">Holiday</SelectItem>
                                        <SelectItem value="summer">Summer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button onClick={handleTakePhoto} className="w-full py-8 text-lg font-bold" variant="default">
                                Take Photo
                            </Button>

                            <div className="pt-4 border-t text-center space-y-2">
                                <p className="text-xs text-muted-foreground">Scan to Share:</p>
                                <div className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
                                    {origin}/share/{sessionId}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}
