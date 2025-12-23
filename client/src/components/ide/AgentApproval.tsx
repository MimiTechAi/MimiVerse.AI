import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import DiffViewer from './DiffViewer';

interface FileDiff {
    path: string;
    action: 'create' | 'modify' | 'delete';
    originalContent: string;
    newContent: string;
    diff: string;
}

interface MultiFileEditPlan {
    task: string;
    files: FileDiff[];
    reasoning: string;
}

interface AgentApprovalProps {
    plan: MultiFileEditPlan | null;
    onApprove: () => void;
    onReject: () => void;
    isExecuting: boolean;
}

export default function AgentApproval({ plan, onApprove, onReject, isExecuting }: AgentApprovalProps) {
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

    if (!plan) return null;

    const toggleFile = (path: string) => {
        const newExpanded = new Set(expandedFiles);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedFiles(newExpanded);
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'text-green-400';
            case 'modify': return 'text-blue-400';
            case 'delete': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'create': return '+';
            case 'modify': return 'M';
            case 'delete': return '−';
            default: return '?';
        }
    };

    const getLanguage = (path: string) => {
        if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
        if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
        if (path.endsWith('.css')) return 'css';
        if (path.endsWith('.html')) return 'html';
        if (path.endsWith('.json')) return 'json';
        if (path.endsWith('.md')) return 'markdown';
        return 'plaintext';
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1E1E24] rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-white/10">
                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-[#27272A] rounded-t-xl">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="bg-purple-600/20 text-purple-400 p-1 rounded">AI</span>
                            Proposed Changes
                        </h2>
                        <div className="text-xs font-mono text-gray-500">
                            {plan.files.length} file(s)
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-4 font-medium">{plan.task}</p>
                    <div className="bg-[#1E1E24] rounded-lg p-4 text-sm border border-white/5">
                        <span className="text-purple-400 font-bold uppercase text-xs tracking-wider block mb-1">Reasoning</span>
                        <span className="text-gray-300 leading-relaxed">{plan.reasoning}</span>
                    </div>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#1E1E24]">
                    {plan.files.map((file, index) => (
                        <div key={index} className="bg-[#27272A] rounded-lg border border-white/5 overflow-hidden shadow-sm">
                            {/* File Header */}
                            <button
                                onClick={() => toggleFile(file.path)}
                                className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors group"
                            >
                                {expandedFiles.has(file.path) ? (
                                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-white" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-white" />
                                )}

                                <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${file.action === 'create' ? 'bg-green-500/20 text-green-400' :
                                        file.action === 'delete' ? 'bg-red-500/20 text-red-400' :
                                            'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {file.action.toUpperCase()}
                                </span>

                                <span className="text-sm text-gray-200 flex-1 text-left truncate font-mono group-hover:text-purple-300 transition-colors">
                                    {file.path}
                                </span>
                            </button>

                            {/* Diff View */}
                            {expandedFiles.has(file.path) && (
                                <div className="border-t border-white/10 p-4 bg-[#1E1E24]">
                                    <DiffViewer
                                        original={file.originalContent}
                                        modified={file.newContent}
                                        language={getLanguage(file.path)}
                                        height="300px"
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-700 flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                        {plan.files.length} file{plan.files.length !== 1 ? 's' : ''} will be changed
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onReject}
                            disabled={isExecuting}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Reject
                        </button>

                        <button
                            onClick={onApprove}
                            disabled={isExecuting}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Check className="w-4 h-4" />
                            {isExecuting ? 'Executing...' : 'Approve & Execute'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
