/**
 * Vite configuration for Electron preload script
 */

import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'electron/preload.ts'),
            formats: ['es'],
            fileName: () => 'preload.js',
        },
        outDir: '.vite/build',
        emptyOutDir: false,
        rollupOptions: {
            external: [
                'electron',
            ],
            output: {
                entryFileNames: '[name].js',
            },
        },
        minify: false,
        sourcemap: true,
    },
});
