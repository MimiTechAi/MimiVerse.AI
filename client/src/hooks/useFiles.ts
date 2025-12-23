import { useState, useEffect, useCallback } from 'react';
import { FileNode } from '@/lib/file-system';

export interface FileChangeEvent {
    path: string;
    changeType: 'create' | 'update' | 'delete' | 'move';
    content?: string;
    oldPath?: string;
    timestamp: number;
}

export interface FileOperation {
    path: string;
    content?: string;
    changeType: FileChangeEvent['changeType'];
}

/**
 * Enhanced Hook to load and manage real project files from backend
 * Supports real-time file changes and file operations
 */
export function useFiles(projectId: string | null) {
    const [files, setFiles] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fileChanges, setFileChanges] = useState<FileChangeEvent[]>([]);

    const loadFiles = async () => {
        if (!projectId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/v1/files/workspace/tree`);

            if (!response.ok) {
                throw new Error(`Failed to load files: ${response.statusText}`);
            }

            const data = await response.json();
            setFiles(data.files || []);
        } catch (err) {
            console.error('Failed to load files:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setFiles([]);
        } finally {
            setLoading(false);
        }
    };

    // File change handler for WebSocket updates
    const handleFileChange = useCallback((change: FileChangeEvent) => {
        setFileChanges(prev => [...prev, change]);
        
        // Auto-refresh files tree on changes
        if (change.changeType === 'create' || change.changeType === 'delete') {
            loadFiles();
        }
    }, [loadFiles]);

    useEffect(() => {
        loadFiles();

        // WebSocket for live file updates - NOW ACTIVE
        if (!projectId) return;

        const ws = new WebSocket(`ws://${location.host}/ws/files`);

        ws.onopen = () => {
            console.log('[useFiles] WebSocket connected');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                // Handle file change events from FileManager
                if (message.type === 'file_change') {
                    console.log('[useFiles] File change detected:', message.data);
                    
                    // Update file changes state
                    handleFileChange(message.data);
                    
                    // Refresh files tree for structural changes
                    if (message.data.changeType === 'create' || message.data.changeType === 'delete') {
                        loadFiles();
                    }
                }
                
                // Handle legacy file events for compatibility
                if (message.type === 'file:changed' || message.type === 'file:created' || message.type === 'file:deleted') {
                    console.log('[useFiles] File update detected, refreshing...');
                    loadFiles();
                }
            } catch (err) {
                console.error('[useFiles] WebSocket message error:', err);
            }
        };

        ws.onerror = (error) => {
            console.error('[useFiles] WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('[useFiles] WebSocket closed');
        };

        return () => {
            ws.close();
        };
    }, [projectId, handleFileChange, loadFiles]);

    const refreshFiles = () => {
        loadFiles();
    };

    // File operation functions
    const writeFile = useCallback(async (path: string, content: string): Promise<void> => {
        try {
            const response = await fetch('/api/v1/files/write', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ path, content }),
            });

            if (!response.ok) {
                throw new Error(`Failed to write file: ${response.statusText}`);
            }

            // Refresh files after successful write
            await loadFiles();
        } catch (err) {
            console.error('Failed to write file:', err);
            throw err;
        }
    }, [projectId]);

    const deleteFile = useCallback(async (path: string): Promise<void> => {
        try {
            const response = await fetch('/api/v1/files/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ path }),
            });

            if (!response.ok) {
                throw new Error(`Failed to delete file: ${response.statusText}`);
            }

            // Refresh files after successful delete
            await loadFiles();
        } catch (err) {
            console.error('Failed to delete file:', err);
            throw err;
        }
    }, [projectId]);

    const moveFile = useCallback(async (oldPath: string, newPath: string): Promise<void> => {
        try {
            const response = await fetch('/api/v1/files/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ oldPath, newPath }),
            });

            if (!response.ok) {
                throw new Error(`Failed to move file: ${response.statusText}`);
            }

            // Refresh files after successful move
            await loadFiles();
        } catch (err) {
            console.error('Failed to move file:', err);
            throw err;
        }
    }, [projectId]);

    const batchWriteFiles = useCallback(async (operations: FileOperation[]): Promise<void> => {
        try {
            const response = await fetch('/api/v1/files/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ operations }),
            });

            if (!response.ok) {
                throw new Error(`Failed to batch write files: ${response.statusText}`);
            }

            // Refresh files after successful batch operation
            await loadFiles();
        } catch (err) {
            console.error('Failed to batch write files:', err);
            throw err;
        }
    }, [projectId]);

    const clearFileChanges = useCallback(() => {
        setFileChanges([]);
    }, []);

    return { 
        files, 
        loading, 
        error, 
        refreshFiles,
        fileChanges,
        writeFile,
        deleteFile,
        moveFile,
        batchWriteFiles,
        handleFileChange,
        clearFileChanges
    };
}
