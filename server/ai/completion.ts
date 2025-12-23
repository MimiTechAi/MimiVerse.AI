import { generateCompletion } from "./utils/ollama";

/**
 * Generate code completion suggestion
 */
export async function completeCode(content: string, offset: number, filePath: string) {
    try {
        // Extract context around cursor
        const beforeCursor = content.slice(Math.max(0, offset - 500), offset);
        const afterCursor = content.slice(offset, offset + 200);

        const prompt = `Complete the following code. Only return the completion, no explanations:

Before cursor:
${beforeCursor}

After cursor:
${afterCursor}`;

        const suggestion = await generateCompletion(
            "Provide a SHORT (1-2 lines max) code completion for the cursor position.",
            prompt
        );

        // Clean up the suggestion
        const cleaned = suggestion.trim().split('\n')[0];
        return cleaned;
    } catch (error) {
        console.error("Completion failed:", error);
        return "";
    }
}
