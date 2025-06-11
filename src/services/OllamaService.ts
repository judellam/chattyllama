import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { OllamaChatResponse, ConversationMessage } from '../types';

const execAsync = promisify(exec);

export class OllamaService {
    private _conversationHistory: ConversationMessage[] = [];
    private _currentContext?: string; // Store context in service

    async checkStatus(): Promise<boolean> {
        try {
            // Add timeout to prevent hanging
            const { stdout } = await Promise.race([
                execAsync('ollama list'),
                new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 5000) // 5 second timeout
                )
            ]);
            
            return stdout.includes('NAME') || stdout.length > 0;
        } catch (error) {
            console.error('Ollama check failed:', error);
            return false;
        }
    }

    async sendChatMessage(text: string, endpoint: string, model: string): Promise<string> {
        // Build message with context if available
        let messageContent = text;
        if (this._currentContext) {
            messageContent = `Context: ${this._currentContext}\n\nUser: ${text}`;
        }

        // Add system prompt to encourage JSON responses
        const systemPrompt = `You are a helpful coding assistant. Always respond with structured JSON in the following format wrapped in \`\`\`json code blocks:

{
  "details": "Your detailed explanation here",
  "code": [
    {
      "content": "// Your code example here",
      "language": "javascript"
    }
  ],
  "summary": "Brief recap here",
  "questions": ["Question 1 if needed", "Question 2 if needed"],
  "context": "topic:lang:concepts:skill-level",
  "actions": [
    {
      "type": "list_files",
      "params": {
        "directory": ".",
        "extensions": [".js", ".ts"]
      }
    }
  ]
}

User request: ${messageContent}`;

        this._conversationHistory.push({
            role: 'user',
            content: systemPrompt
        });

        const response = await fetch(`${endpoint}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: this._conversationHistory,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as OllamaChatResponse;

        // Add assistant response to conversation history
        this._conversationHistory.push({
            role: 'assistant',
            content: data.message.content
        });

        return data.message.content;
    }

    setContext(context: string): void {
        this._currentContext = context;
    }

    clearHistory(): void {
        this._conversationHistory = [];
        this._currentContext = undefined; // Clear context when clearing history
    }

    getContext(): string | undefined {
        return this._currentContext;
    }

    getHistory(): ConversationMessage[] {
        return [...this._conversationHistory];
    }

    async startInTerminal(): Promise<void> {
        const terminal = vscode.window.createTerminal('Ollama Server');
        terminal.sendText('ollama serve');
        terminal.show();
        
        vscode.window.showInformationMessage(
            'Starting Ollama in terminal. Please wait a moment for it to start.',
            'Check Status'
        ).then(async (action) => {
            if (action === 'Check Status') {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const isRunning = await this.checkStatus();
                
                if (isRunning) {
                    vscode.window.showInformationMessage('Ollama is now running!');
                } else {
                    vscode.window.showWarningMessage('Ollama may still be starting. Please wait a moment.');
                }
            }
        });
    }
}