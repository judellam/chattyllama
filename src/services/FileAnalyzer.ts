import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface FileAnalysis {
    filePath: string;
    relativePath: string;
    language: string;
    summary: string;
    methods: string[];
    size: number;
}

export class FileAnalyzer {
    private readonly supportedExtensions = [
        '.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.cpp', '.c', '.h',
        '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.dart', '.vue',
        '.json', '.md', '.txt', '.yaml', '.yml', '.xml', '.html', '.css', '.scss'
    ];

    constructor(private ollamaService: any) {}

    async analyzeWorkspace(workspacePath: string): Promise<FileAnalysis[]> {
        const files = await this.getFilesRecursively(workspacePath);
        const analyses: FileAnalysis[] = [];

        for (const file of files) {
            try {
                const analysis = await this.analyzeFile(file, workspacePath);
                if (analysis) {
                    analyses.push(analysis);
                }
            } catch (error) {
                console.error(`Error analyzing file ${file}:`, error);
            }
        }

        return analyses;
    }

    private async getFilesRecursively(dirPath: string): Promise<string[]> {
        const files: string[] = [];
        
        const traverse = async (currentPath: string) => {
            try {
                const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(currentPath, entry.name);
                    
                    // Skip common directories that shouldn't be analyzed
                    if (entry.isDirectory()) {
                        if (!this.shouldSkipDirectory(entry.name)) {
                            await traverse(fullPath);
                        }
                    } else if (entry.isFile()) {
                        if (this.shouldAnalyzeFile(entry.name)) {
                            files.push(fullPath);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error reading directory ${currentPath}:`, error);
            }
        };

        await traverse(dirPath);
        return files;
    }

    private shouldSkipDirectory(dirName: string): boolean {
        const skipDirs = [
            'node_modules', '.git', '.vscode', 'dist', 'build', 'out',
            '.next', '.nuxt', 'coverage', '.nyc_output', 'target',
            'bin', 'obj', '__pycache__', '.pytest_cache', 'venv',
            '.env', '.idea', '.vs', 'tmp', 'temp'
        ];
        return skipDirs.includes(dirName) || dirName.startsWith('.');
    }

    private shouldAnalyzeFile(fileName: string): boolean {
        const ext = path.extname(fileName).toLowerCase();
        return this.supportedExtensions.includes(ext) && !fileName.startsWith('.');
    }

    private async analyzeFile(filePath: string, workspacePath: string): Promise<FileAnalysis | null> {
        try {
            const stats = await fs.promises.stat(filePath);
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const relativePath = path.relative(workspacePath, filePath);
            const ext = path.extname(filePath);
            const language = this.getLanguageFromExtension(ext);

            // Skip very large files (>100KB)
            if (stats.size > 100 * 1024) {
                return {
                    filePath,
                    relativePath,
                    language,
                    summary: 'File too large to analyze',
                    methods: [],
                    size: stats.size
                };
            }

            // Create prompt for Ollama
            const prompt = `Analyze this ${language} file and provide:
1. A brief summary of what this file does
2. List of main functions/methods/classes with their purpose

File: ${relativePath}
Content:
\`\`\`${language}
${content}
\`\`\`

Please respond in JSON format:
{
  "summary": "Brief description of the file",
  "methods": ["method1: description", "method2: description"]
}`;

            const response = await this.ollamaService.sendMessage(prompt);
            const analysis = this.parseAnalysisResponse(response);

            return {
                filePath,
                relativePath,
                language,
                summary: analysis.summary || 'No summary available',
                methods: analysis.methods || [],
                size: stats.size
            };

        } catch (error) {
            console.error(`Error analyzing file ${filePath}:`, error);
            return null;
        }
    }

    private getLanguageFromExtension(ext: string): string {
        const languageMap: { [key: string]: string } = {
            '.ts': 'typescript',
            '.js': 'javascript',
            '.tsx': 'typescript',
            '.jsx': 'javascript',
            '.py': 'python',
            '.java': 'java',
            '.cs': 'csharp',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.php': 'php',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.dart': 'dart',
            '.vue': 'vue',
            '.json': 'json',
            '.md': 'markdown',
            '.txt': 'text',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.xml': 'xml',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss'
        };
        return languageMap[ext.toLowerCase()] || 'text';
    }

    private parseAnalysisResponse(response: string): { summary?: string; methods?: string[] } {
        try {
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error parsing analysis response:', error);
        }

        // Fallback: parse manually
        const lines = response.split('\n');
        let summary = '';
        const methods: string[] = [];

        for (const line of lines) {
            if (line.toLowerCase().includes('summary')) {
                summary = line.replace(/.*summary[:\-\s]*/i, '').trim();
            } else if (line.includes('function') || line.includes('method') || line.includes('class')) {
                methods.push(line.trim());
            }
        }

        return { summary, methods };
    }

    generateProjectSummary(analyses: FileAnalysis[]): string {
        const totalFiles = analyses.length;
        const languages = [...new Set(analyses.map(a => a.language))];
        const totalMethods = analyses.reduce((sum, a) => sum + a.methods.length, 0);
        
        let summary = `Project Analysis Summary:\n\n`;
        summary += `- Total files analyzed: ${totalFiles}\n`;
        summary += `- Programming languages: ${languages.join(', ')}\n`;
        summary += `- Total methods/functions found: ${totalMethods}\n\n`;
        
        summary += `File breakdown:\n`;
        for (const analysis of analyses) {
            summary += `\n${analysis.relativePath} (${analysis.language}):\n`;
            summary += `  Summary: ${analysis.summary}\n`;
            if (analysis.methods.length > 0) {
                summary += `  Methods: ${analysis.methods.slice(0, 3).join(', ')}${analysis.methods.length > 3 ? '...' : ''}\n`;
            }
        }

        return summary;
    }
}