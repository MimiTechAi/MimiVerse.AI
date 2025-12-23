import { useState, useEffect } from 'react';

export interface Settings {
    theme: 'vs-dark' | 'light';
    fontSize: number;
    fontFamily: string;
    wordWrap: 'on' | 'off';
    minimap: boolean;
}

const DEFAULT_SETTINGS: Settings = {
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: 'JetBrains Mono, monospace',
    wordWrap: 'on',
    minimap: true,
};

export function useSettings() {
    const [settings, setSettings] = useState<Settings>(() => {
        try {
            const saved = localStorage.getItem('mimiverse-settings');
            return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
        } catch (e) {
            return DEFAULT_SETTINGS;
        }
    });

    useEffect(() => {
        localStorage.setItem('mimiverse-settings', JSON.stringify(settings));
    }, [settings]);

    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return { settings, updateSetting };
}
