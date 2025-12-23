import * as ts from "typescript";
import * as fs from "fs/promises";
import * as path from "path";

export interface OutlineSymbol {
    name: string;
    kind: string; // 'class', 'function', 'interface', 'variable', 'method', etc.
    line: number;
    endLine: number;
    children?: OutlineSymbol[];
}

/**
 * Parse TypeScript/JavaScript file and extract code symbols
 */
export class OutlineParser {
    /**
     * Parse a file and return outline symbols
     */
    async parseFile(filePath: string): Promise<OutlineSymbol[]> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const ext = path.extname(filePath);

            // Only parse TS/JS files
            if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
                return [];
            }

            return this.parseContent(content, filePath);
        } catch (error) {
            console.error(`Failed to parse ${filePath}:`, error);
            return [];
        }
    }

    /**
     * Parse content string and extract symbols
     */
    private parseContent(content: string, fileName: string): OutlineSymbol[] {
        const sourceFile = ts.createSourceFile(
            fileName,
            content,
            ts.ScriptTarget.Latest,
            true
        );

        const symbols: OutlineSymbol[] = [];

        const visit = (node: ts.Node, parent?: OutlineSymbol) => {
            let symbol: OutlineSymbol | undefined;

            // Extract different node types
            if (ts.isClassDeclaration(node) && node.name) {
                symbol = {
                    name: node.name.text,
                    kind: 'class',
                    line: this.getLineNumber(sourceFile, node.pos),
                    endLine: this.getLineNumber(sourceFile, node.end),
                    children: []
                };
            } else if (ts.isFunctionDeclaration(node) && node.name) {
                symbol = {
                    name: node.name.text,
                    kind: 'function',
                    line: this.getLineNumber(sourceFile, node.pos),
                    endLine: this.getLineNumber(sourceFile, node.end),
                };
            } else if (ts.isInterfaceDeclaration(node)) {
                symbol = {
                    name: node.name.text,
                    kind: 'interface',
                    line: this.getLineNumber(sourceFile, node.pos),
                    endLine: this.getLineNumber(sourceFile, node.end),
                    children: []
                };
            } else if (ts.isMethodDeclaration(node) && node.name) {
                const name = ts.isIdentifier(node.name) ? node.name.text : node.name.getText(sourceFile);
                symbol = {
                    name,
                    kind: 'method',
                    line: this.getLineNumber(sourceFile, node.pos),
                    endLine: this.getLineNumber(sourceFile, node.end),
                };
            } else if (ts.isVariableStatement(node)) {
                // Handle const/let/var declarations
                node.declarationList.declarations.forEach(decl => {
                    if (ts.isIdentifier(decl.name)) {
                        const varSymbol: OutlineSymbol = {
                            name: decl.name.text,
                            kind: 'variable',
                            line: this.getLineNumber(sourceFile, decl.pos),
                            endLine: this.getLineNumber(sourceFile, decl.end),
                        };
                        if (parent?.children) {
                            parent.children.push(varSymbol);
                        } else {
                            symbols.push(varSymbol);
                        }
                    }
                });
            } else if (ts.isEnumDeclaration(node)) {
                symbol = {
                    name: node.name.text,
                    kind: 'enum',
                    line: this.getLineNumber(sourceFile, node.pos),
                    endLine: this.getLineNumber(sourceFile, node.end),
                };
            }

            // Add symbol to appropriate list
            if (symbol) {
                if (parent?.children) {
                    parent.children.push(symbol);
                } else {
                    symbols.push(symbol);
                }

                // Visit children if this is a container
                if (symbol.children !== undefined) {
                    ts.forEachChild(node, (child) => visit(child, symbol));
                }
            } else {
                // Continue traversal
                ts.forEachChild(node, (child) => visit(child, parent));
            }
        };

        ts.forEachChild(sourceFile, visit);

        return symbols;
    }

    /**
     * Get line number from position
     */
    private getLineNumber(sourceFile: ts.SourceFile, pos: number): number {
        const { line } = sourceFile.getLineAndCharacterOfPosition(pos);
        return line + 1; // Convert to 1-based
    }
}
