import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    Menu,
    File,
    FolderOpen,
    Save,
    Download,
    Settings,
    LogOut
} from "lucide-react";
import { FileExplorer } from '@/components/FileExplorer';

interface FileMenuProps {
    onOpenSettings?: () => void;
    onRefreshFiles?: () => void;
}

export function FileMenu({ onOpenSettings, onRefreshFiles }: FileMenuProps) {
    const [showFolderPicker, setShowFolderPicker] = useState(false);

    const handleNewFile = async () => {
        // TODO: Implement new file creation modal
        const name = prompt('New file name (relative to project root):');
        if (!name) return;

        try {
            const response = await fetch('/api/v1/files/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: name, type: 'file' })
            });

            if (!response.ok) {
                console.error('New file creation failed:', await response.text());
                return;
            }

            onRefreshFiles?.();
        } catch (error) {
            console.error('New file creation error:', error);
        }
    };

    const handleOpenFolder = () => {
        setShowFolderPicker(true);
    };

    const handleSave = () => {
        // Trigger save on active editor
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 's',
            ctrlKey: true,
            metaKey: true,
        }));
    };

    const handleSettings = () => {
        if (onOpenSettings) {
            onOpenSettings();
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-[hsl(var(--muted-foreground))] hover:bg-white/5">
                        <Menu size={18} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem onClick={handleNewFile}>
                        <File className="mr-2 h-4 w-4" />
                        New File
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleOpenFolder}>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Open Folder...
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                        <span className="ml-auto text-xs text-muted-foreground">⌘S</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSettings}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <FileExplorer
                open={showFolderPicker}
                onOpenChange={setShowFolderPicker}
                onSelect={async (path) => {
                    try {
                        const res = await fetch('/api/workspace/set', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path })
                        });
                        if (res.ok) {
                            window.location.reload();
                        }
                    } catch (error) {
                        console.error('Failed to set workspace:', error);
                    }
                }}
            />
        </>
    );
}
