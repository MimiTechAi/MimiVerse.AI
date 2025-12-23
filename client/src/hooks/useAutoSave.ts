import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for auto-saving files and handling manual save (Ctrl+S)
 * @param fileId - Current file ID
 * @param content - Current file content
 * @param autoSaveDelay - Delay in ms before auto-saving (default: 1000ms)
 */
export function useAutoSave(
    fileId: string | undefined,
    content: string | undefined,
    autoSaveDelay: number = 1000,
    onSaveComplete?: (fileId: string) => void
) {
    const [unsaved, setUnsaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const saveFile = useCallback(async (id: string, text: string) => {
        if (!id || text === undefined) return;

        setSaving(true);
        try {
            const response = await fetch('/api/v1/files/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: id, content: text })
            });

            if (!response.ok) {
                throw new Error('Save failed');
            }

            setUnsaved(false);
            setLastSaved(new Date());
            onSaveComplete?.(id);  // Notify parent of successful save
            console.log(`[useAutoSave] Saved: ${id}`);
        } catch (error) {
            console.error('[useAutoSave] Save error:', error);
            // Keep unsaved flag
        } finally {
            setSaving(false);
        }
    }, []);

    // Debounced auto-save
    useEffect(() => {
        if (!fileId || content === undefined) return;

        setUnsaved(true);

        const timer = setTimeout(() => {
            saveFile(fileId, content);
        }, autoSaveDelay);

        return () => clearTimeout(timer);
    }, [content, fileId, autoSaveDelay, saveFile]);

    // Manual save (Ctrl+S / Cmd+S)
    useEffect(() => {
        const handleSave = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (fileId && content !== undefined) {
                    saveFile(fileId, content);
                }
            }
        };

        document.addEventListener('keydown', handleSave);
        return () => document.removeEventListener('keydown', handleSave);
    }, [fileId, content, saveFile]);

    return {
        unsaved,
        saving,
        lastSaved,
        saveFile: () => fileId && content !== undefined && saveFile(fileId, content)
    };
}
