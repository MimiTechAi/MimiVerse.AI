import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, Play, AlertCircle, Terminal, FileCode } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface SubTask {
    id: string;
    description: string;
    tool: "terminal" | "file" | "browser";
    status: "pending" | "running" | "completed" | "failed";
}

interface ProjectPhase {
    id: string;
    name: string;
    description: string;
    tasks: SubTask[];
    status: "pending" | "active" | "completed";
}

interface ProjectPlan {
    goal: string;
    phases: ProjectPhase[];
    reasoning: string;
}

interface ProjectPlanViewProps {
    plan: ProjectPlan;
    onStart: () => void;
    isExecuting: boolean;
}

export default function ProjectPlanView({ plan, onStart, isExecuting }: ProjectPlanViewProps) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'active': return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
            case 'running': return <Clock className="w-4 h-4 text-blue-400 animate-spin" />;
            case 'failed': return <AlertCircle className="w-5 h-5 text-red-500" />;
            default: return <Circle className="w-5 h-5 text-gray-600" />;
        }
    };

    const getToolIcon = (tool: string) => {
        switch (tool) {
            case 'terminal': return <Terminal className="w-3 h-3" />;
            case 'file': return <FileCode className="w-3 h-3" />;
            default: return null;
        }
    };

    return (
        <div className="bg-[#27272A] rounded-lg border border-white/10 overflow-hidden my-4">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-purple-400" />
                    Project Plan
                </h3>
                <p className="text-sm text-gray-400 mt-1">{plan.goal}</p>
            </div>

            {/* Phases */}
            <div className="p-4 space-y-6">
                {plan.phases.map((phase) => (
                    <div key={phase.id} className="relative pl-6 border-l border-white/10 last:border-0">
                        {/* Phase Status Dot */}
                        <div className="absolute -left-[11px] top-0 bg-[#27272A] p-1">
                            {getStatusIcon(phase.status)}
                        </div>

                        <div className="mb-2">
                            <h4 className="text-sm font-medium text-gray-200">{phase.name}</h4>
                            <p className="text-xs text-gray-500">{phase.description}</p>
                        </div>

                        {/* Tasks */}
                        <div className="space-y-2 mt-3">
                            {phase.tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`flex items-center gap-3 p-2 rounded border ${task.status === 'running' ? 'bg-blue-500/10 border-blue-500/20' :
                                            task.status === 'completed' ? 'bg-green-500/5 border-green-500/10' :
                                                'bg-white/5 border-white/5'
                                        }`}
                                >
                                    <div className="shrink-0">
                                        {task.status === 'running' ? (
                                            <Clock className="w-3 h-3 text-blue-400 animate-spin" />
                                        ) : task.status === 'completed' ? (
                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        ) : (
                                            <Circle className="w-3 h-3 text-gray-600" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-300 truncate">{task.description}</p>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/20 text-[10px] text-gray-500 font-mono uppercase">
                                        {getToolIcon(task.tool)}
                                        {task.tool}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                {!isExecuting && (
                    <Button
                        onClick={onStart}
                        className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
                    >
                        <Play className="w-4 h-4" />
                        Start Build
                    </Button>
                )}
                {isExecuting && (
                    <div className="flex items-center gap-2 text-sm text-blue-400">
                        <Clock className="w-4 h-4 animate-spin" />
                        Executing Plan...
                    </div>
                )}
            </div>
        </div>
    );
}
