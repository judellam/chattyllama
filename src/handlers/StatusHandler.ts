import * as vscode from 'vscode';
import { OllamaService } from '../services/OllamaService';

export class StatusHandler {
    constructor(private ollamaService: OllamaService) {}

    async showOllamaStatusMessage(isRunning: boolean): Promise<void> {
        if (!isRunning) {
            const action = await vscode.window.showErrorMessage(
                'Ollama is not running or not installed. ChattyLlama needs Ollama to function.',
                { modal: false },
                'Start Ollama Manually',
                'Install Ollama',
                'How to Start Ollama'
            );
            
            if (action === 'Start Ollama Manually') {
                const startAction = await vscode.window.showInformationMessage(
                    'To start Ollama manually:\n\n1. Open Terminal\n2. Run: ollama serve\n3. Keep the terminal open\n\nOr start the Ollama app if you have it installed.',
                    { modal: true },
                    'Open Terminal',
                    'I Started It'
                );
                
                if (startAction === 'Open Terminal') {
                    const terminal = vscode.window.createTerminal('Start Ollama');
                    terminal.sendText('echo "Run: ollama serve"');
                    terminal.show();
                } else if (startAction === 'I Started It') {
                    // Give it a moment then check again
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const retryStatus = await this.ollamaService.checkStatus();
                    if (retryStatus) {
                        vscode.window.showInformationMessage('Great! Ollama is now running.');
                    } else {
                        vscode.window.showWarningMessage('Ollama still not detected. Make sure it\'s running with "ollama serve"');
                    }
                }
            } else if (action === 'Install Ollama') {
                vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai'));
                vscode.window.showInformationMessage('After installing Ollama, restart VS Code and run "ollama serve" in terminal.');
            } else if (action === 'How to Start Ollama') {
                const instruction = await vscode.window.showInformationMessage(
                    'To use ChattyLlama:\n\n1. Install Ollama from ollama.ai\n2. Open Terminal\n3. Run: ollama serve\n4. Download a model: ollama pull code-helper\n5. Keep terminal open while using ChattyLlama',
                    { modal: true },
                    'Open Ollama Website',
                    'Open Terminal'
                );
                
                if (instruction === 'Open Ollama Website') {
                    vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai'));
                } else if (instruction === 'Open Terminal') {
                    const terminal = vscode.window.createTerminal('Ollama Setup');
                    terminal.sendText('echo "1. Run: ollama serve"');
                    terminal.sendText('echo "2. In another terminal: ollama pull code-helper"');
                    terminal.show();
                }
            }
        }
    }
}