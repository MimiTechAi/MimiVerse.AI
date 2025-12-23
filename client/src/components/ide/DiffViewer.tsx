import { DiffEditor } from "@monaco-editor/react";
import { useEffect, useState } from "react";

interface DiffViewerProps {
    original: string;
    modified: string;
    language?: string;
    height?: string;
}

export default function DiffViewer({ original, modified, language = "typescript", height = "400px" }: DiffViewerProps) {
    return (
        <div className="border border-white/10 rounded-md overflow-hidden">
            <DiffEditor
                height={height}
                language={language}
                original={original}
                modified={modified}
                theme="vs-dark"
                options={{
                    readOnly: true,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 12,
                    lineNumbers: "on",
                    renderOverviewRuler: false,
                }}
            />
        </div>
    );
}
