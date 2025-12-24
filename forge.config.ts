/**
 * Electron Forge Configuration for Mimiverse IDE
 * Production-ready desktop application packaging
 */

import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
    packagerConfig: {
        name: 'Mimiverse',
        executableName: 'mimiverse-ide', // Must match package.json name to satisfy makers
        appBundleId: 'ai.mimiverse.ide',
        appCategoryType: 'public.app-category.developer-tools',
        icon: './assets/icon',
        asar: true,
        ignore: [
            /^\/(?!(package\.json|\.vite|assets)(.*))/,
            /^\/assets\/(?!(icon\.icns|icon\.ico|icon\.png)(.*))/,
            /\/\.git($|\/)/,
            /\/\.github($|\/)/,
            /\/\.vscode($|\/)/,
        ],
        // Signing and Notarization
        osxSign: {
            identity: 'Developer ID Application: Michael Bemler (63X96LFZ6Z)', // Explicitly use the certificate from the screenshot
            hardenedRuntime: true,
            entitlements: './entitlements.plist',
            entitlementsInherit: './entitlements.plist',
            gatekeeperAssess: false,
            'signature-flags': 'library',
        } as any,
        osxNotarize: process.env.APPLE_ID ? {
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_ID_PASSWORD!,
            teamId: process.env.APPLE_TEAM_ID!,
        } : undefined,
    },
    rebuildConfig: {},
    makers: [
        // Windows installer
        new MakerSquirrel({
            name: 'Mimiverse',
            authors: 'Mimi Tech AI',
            description: 'AI-Powered IDE for Modern Development',
            // iconUrl: 'https://mimiverse.ai/icon.ico', // Ensure these exist or comment out if not ready
            setupIcon: './assets/icon.ico',
        }),
        // macOS DMG
        new MakerDMG({
            name: 'Mimiverse',
            icon: './assets/icon.icns',
            overwrite: true,
        }),
        // Linux DEB
        new MakerDeb({
            options: {
                name: 'mimiverse',
                productName: 'Mimiverse',
                genericName: 'IDE',
                description: 'AI-Powered IDE for Modern Development',
                categories: ['Development'],
                icon: './assets/icon.png',
                mimeType: ['text/plain', 'application/javascript', 'application/typescript'],
            },
        }),
        // Linux RPM
        new MakerRpm({
            options: {
                name: 'mimiverse',
                productName: 'Mimiverse',
                description: 'AI-Powered IDE for Modern Development',
                categories: ['Development'],
                icon: './assets/icon.png',
            },
        }),
        // ZIP for all platforms
        new MakerZIP({}, ['darwin', 'win32', 'linux']),
    ],
    plugins: [
        new VitePlugin({
            // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
            build: [
                {
                    // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
                    entry: 'electron/main.ts',
                    config: 'vite.main.config.ts',
                },
                {
                    entry: 'electron/preload.ts',
                    config: 'vite.preload.config.ts',
                },
            ],
            renderer: [
                {
                    name: 'main_window',
                    config: 'vite.config.ts',
                },
            ],
        }),
    ],
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
                repository: {
                    owner: 'MimiTechAi',
                    name: 'MimiVerse.AI',
                },
                prerelease: false,
                draft: true,
            },
        },
    ],
};

export default config;
