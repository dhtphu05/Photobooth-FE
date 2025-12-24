import axios from 'axios';

// Ensure base URL is set (can also rely on global config in providers.tsx)
const api = axios.create({
    baseURL: 'https://api-photobooth.lcdkhoacntt-dut.live',
});

export const uploadImage = async (sessionId: string, file: Blob): Promise<string> => {
    const formData = new FormData();
    // Name 'file' matches the typical NestJS FileInterceptor('file')
    formData.append('file', file, 'capture.jpg');

    try {
        const response = await api.post(`/api/sessions/${sessionId}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            params: {
                type: 'ORIGINAL' // Explicitly set type if required by backend DTO
            }
        });

        // Assuming backend returns Media object: { id, url, type }
        return response.data.url;
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
};
