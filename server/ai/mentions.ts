import { searchCodebase } from "../codebase/indexer";
import { FileTool } from "./tools/file-tool";

export interface Mention {
    type: "file" | "codebase" | "web";
    value: string;
    raw: string;
}

/**
 * Parse and handle @mentions in user messages
 */
export class MentionsParser {
    private fileTool: FileTool;

    constructor(private workspaceRoot: string = process.cwd()) {
        this.fileTool = new FileTool(workspaceRoot);
    }

    /**
     * Extract all mentions from a message
     */
    extractMentions(message: string): Mention[] {
        const mentions: Mention[] = [];

        // Match @file:path/to/file
        const fileMatches = Array.from(message.matchAll(/@file:([^\s]+)/g));
        for (const match of fileMatches) {
            mentions.push({
                type: "file",
                value: match[1],
                raw: match[0]
            });
        }

        // Match @codebase:query
        const codebaseMatches = Array.from(message.matchAll(/@codebase:([^\n]+)/g));
        for (const match of codebaseMatches) {
            mentions.push({
                type: "codebase",
                value: match[1].trim(),
                raw: match[0]
            });
        }

        // Match @web:url
        const webMatches = Array.from(message.matchAll(/@web:(https?:\/\/[^\s]+)/g));
        for (const match of webMatches) {
            mentions.push({
                type: "web",
                value: match[1],
                raw: match[0]
            });
        }

        return mentions;
    }

    /**
     * Resolve mentions to actual content
     */
    async resolveMentions(mentions: Mention[], projectId?: string): Promise<string> {
        const resolvedParts: string[] = [];

        for (const mention of mentions) {
            try {
                if (mention.type === "file") {
                    const content = await this.fileTool.readFile(mention.value);
                    resolvedParts.push(
                        `

=== File: ${mention.value} ===
${content.slice(0, 3000)}
${content.length > 3000 ? '...(truncated)' : ''}
`
                    );
                } else if (mention.type === "codebase") {
                    const results = await searchCodebase(mention.value, 1, projectId || 'default');
                    const summary = results.map(r =>
                        `- ${r.path} (relevance: ${(r.similarity * 100).toFixed(0)}%)`
                    ).join("\n");
                    resolvedParts.push(
                        `

=== Codebase Search: "${mention.value}" ===
${summary}
`
                    );
                } else if (mention.type === "web") {
                    // For web, we'd fetch the URL - for now just note it
                    resolvedParts.push(
                        `\n\n=== Web Reference: ${mention.value} ===\n`
                    );
                }
            } catch (error: any) {
                console.error(`Failed to resolve mention ${mention.raw}:`, error);
                resolvedParts.push(
                    `\n\n=== Error resolving ${mention.raw}: ${error.message} ===\n`
                );
            }
        }

        return resolvedParts.join("");
    }

    /**
     * Process a message with mentions, returning augmented message
     */
    async processMessage(message: string): Promise<string> {
        const mentions = this.extractMentions(message);
        if (mentions.length === 0) {
            return message;
        }

        const resolvedContext = await this.resolveMentions(mentions);

        // Remove mention tags from original message
        let processedMessage = message;
        mentions.forEach(m => {
            processedMessage = processedMessage.replace(m.raw, `[reference: ${m.value}]`);
        });

        return `${processedMessage}\n\n### Context from mentions:${resolvedContext}`;
    }
}
