import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '../gateway/booth.events';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('https://api-photobooth.lcdkhoacntt-dut.live', {
    autoConnect: false,
});
