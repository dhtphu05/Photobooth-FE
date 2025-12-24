import { defineConfig } from 'orval';

export default defineConfig({
    photobooth: {
        output: {
            mode: 'tags-split',
            target: './api/endpoints',
            schemas: './api/model',
            client: 'react-query',
        },
        input: {
            target: 'https://api-photobooth.lcdkhoacntt-dut.live/api/docs-json',
        },
    },
});
