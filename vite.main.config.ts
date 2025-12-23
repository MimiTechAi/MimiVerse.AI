/**
 * Vite configuration for Electron main process
 */

import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'electron/main.ts'),
            formats: ['es'],
            fileName: () => 'main.js',
        },
        outDir: '.vite/build',
        emptyOutDir: false,
        rollupOptions: {
            external: [
                'electron',
                'path',
                'fs',
                'os',
                'url',
                'events',
                'stream',
                'util',
                'crypto',
                'child_process',
                'net',
                'tty',
                'assert',
                'buffer',
            ],
            output: {
                entryFileNames: '[name].js',
            },
        },
        minify: false,
        sourcemap: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './client/src'),
        },
    },
});
