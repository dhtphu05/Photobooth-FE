# Photobooth Frontend Integration Guide

This guide provides everything you need to build the **Controller App** (iPad), **Monitor App** (Big Screen), and **Share Page** (User Phone).

## 1. Connection Details
- **Base URL**: `https://api-photobooth.lcdkhoacntt-dut.live`
- **Swagger JSON**: `https://api-photobooth.lcdkhoacntt-dut.live/api/docs-json`
- **Socket URL**: `https://api-photobooth.lcdkhoacntt-dut.live`

---

## 2. Generate API Client (Orval)
Instead of writing manual fetch calls, generate typed hooks.

1.  **Install**:
    ```bash
    npm install orval @tanstack/react-query axios
    ```
2.  **Configure**: Create `orval.config.ts` in your frontend root:
    ```typescript
    import { defineConfig } from 'orval';
    export default defineConfig({
      photobooth: {
        output: {
          mode: 'tags-split',
          target: './src/api/endpoints',
          schemas: './src/api/model',
          client: 'react-query',
        },
        input: {
          target: 'https://api-photobooth.lcdkhoacntt-dut.live/api/docs-json',
        },
      },
    });
    ```
3.  **Run**: `npx orval`
4.  **Result**: Use hooks like `useCreateSession`, `useUploadSessionMedia`, `useGetSession` from `src/api/endpoints`.

---

## 3. Real-time Communication (Socket.io)
Used to sync the Controller (iPad) with the Monitor.

1.  **Install**: `npm install socket.io-client`
2.  **Shared Types**: Copy `src/gateway/booth.events.ts` from backend to frontend.
3.  **Setup**:
    ```typescript
    import { io, Socket } from 'socket.io-client';
    import { ServerToClientEvents, ClientToServerEvents } from './booth.events';

    export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('https://api-photobooth.lcdkhoacntt-dut.live');
    ```

### Socket Events Reference
| Event | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join` | Client -> Server | `roomId` (Session ID) | Join the room for the current session. |
| `update_state` | Client -> Server | `{ selectedFilter?, selectedFrame? }` | Controller updates filter/frame. |
| `trigger_countdown` | Client -> Server | `roomId` | Controller starts the countdown. |
| `state_updated` | Server -> Client | `{ selectedFilter?, selectedFrame? }` | Monitor updates UI based on Controller. |
| `start_countdown` | Server -> Client | `null` | Monitor shows countdown (3..2..1). |
| `show_result` | Server -> Client | `{ imageUrl }` | Monitor displays the captured photo. |

---

## 4. Implementation Flows

### A. The Setup (Start Session)
1.  **Controller**: Call `createSession()` (via `useCreateSession`).
2.  **Response**: You get a `sessionId` (e.g., `uuid-123`).
3.  **Both Apps**: Connect Socket and emit `join(sessionId)`.

### B. Selecting Configuration
1.  **Controller**: User taps a filter/frame.
    -   Emit `update_state({ selectedFilter: 'bw', selectedFrame: 'holiday' })`.
    -   Call API `updateSession(sessionId, { ... })` to save to DB (optional, but good for persistence).
2.  **Monitor**: Listens for `state_updated`.
    -   Updates the preview live on the big screen.

### C. Taking the Photo
1.  **Controller**: User taps "Take Photo".
    -   Emit `trigger_countdown(sessionId)`.
2.  **Monitor**: Listens for `start_countdown`.
    -   Plays countdown animation.
    -   (Optional) Monitor or Controller captures the image from camera stream.

### D. Upload & Result
1.  **Controller/Monitor**:
    -   Takes the captured blob/file.
    -   Calls `uploadSessionMedia(sessionId, { file: blob }, { type: 'ORIGINAL' })`.
    -   **Response**: Returns the `Media` object with a **public URL**.
2.  *(Optional)* Create a Recap Video:
    -   Calls `uploadSessionMedia(sessionId, { file: videoBlob }, { type: 'VIDEO' })`.

### E. The Share Page (QR Code)
1.  **Controller**:
    -   Generates a QR Code for `https://your-frontend.com/share/{sessionId}`.
2.  **User's Phone (Share Page)**:
    -   Grabs `sessionId` from URL.
    -   Calls `useGetSession(sessionId)`.
    -   **Response**: `{ medias: [{ type: 'ORIGINAL', url: '...' }, { type: 'VIDEO', url: '...' }] }`.
    -   Displays the Photo and Video for download.
