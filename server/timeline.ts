/**
 * Timeline - Activity tracking for user actions
 */

export interface TimelineEvent {
    id: string;
    type: 'file_edit' | 'file_create' | 'file_delete' | 'command_run' | 'ai_request' | 'agent_action';
    description: string;
    timestamp: number;
    metadata?: Record<string, any>;
}

class TimelineManager {
    private events: TimelineEvent[] = [];
    private maxEvents = 100; // Keep last 100 events

    /**
     * Log an event to the timeline
     */
    log(type: TimelineEvent['type'], description: string, metadata?: Record<string, any>) {
        const event: TimelineEvent = {
            id: Math.random().toString(36).substring(7),
            type,
            description,
            timestamp: Date.now(),
            metadata
        };

        this.events.unshift(event); // Add to beginning

        // Keep only last N events
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(0, this.maxEvents);
        }

        // Broadcast timeline events through WebSocket if available
        if (global.agentWS) {
            global.agentWS.broadcast({
                type: 'status' as const,
                data: event
            } as any); // Cast needed as timeline events don't match agent message types exactly
        }
    }

    /**
     * Get all timeline events
     */
    getEvents(): TimelineEvent[] {
        return this.events;
    }

    /**
     * Get events filtered by type
     */
    getEventsByType(type: TimelineEvent['type']): TimelineEvent[] {
        return this.events.filter(e => e.type === type);
    }

    /**
     * Clear all events
     */
    clear() {
        this.events = [];
    }
}

// Global singleton
export const timeline = new TimelineManager();
