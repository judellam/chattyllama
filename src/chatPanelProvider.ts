import * as vscode from 'vscode';
import { OllamaService } from './services/OllamaService';
import { HtmlProvider } from './providers/HtmlProvider';
import { SettingsManager } from './managers/SettingsManager';
import { StatusHandler } from './handlers/StatusHandler';
import { LlamaResponse, ChatHistory, ChatMessage } from './types';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _currentView: 'chat' | 'settings' = 'chat';
    private _chatHistory: ChatHistory = []; // Use the type from types/ChatHistory
    
    private ollamaService: OllamaService;
    private htmlProvider?: HtmlProvider;
    private settingsManager: SettingsManager;
    private statusHandler: StatusHandler;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.ollamaService = new OllamaService();
        this.settingsManager = new SettingsManager();
        this.statusHandler = new StatusHandler(this.ollamaService);
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        this.htmlProvider = new HtmlProvider(this._extensionUri, webviewView.webview);

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        this._updateView();

        // Check Ollama status on startup (non-blocking)
        this._checkOllamaStatusAsync();

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(message => this._handleMessage(message, webviewView));
    }

    private async _checkOllamaStatusAsync(): Promise<void> {
        try {
            vscode.window.showInformationMessage('Checking Ollama status...', { modal: false });
            
            const isOllamaRunning = await this.ollamaService.checkStatus();
            
            if (isOllamaRunning) {
                vscode.window.showInformationMessage('Ollama is running and ready!', { modal: false });
            } else {
                await this.statusHandler.showOllamaStatusMessage(false);
            }
        } catch (error) {
            console.error('Error checking Ollama status:', error);
            await this.statusHandler.showOllamaStatusMessage(false);
        }
    }

    private async _handleMessage(message: any, webviewView: vscode.WebviewView) {
        switch (message.command) {
            case 'openSettings':
                this._currentView = 'settings';
                this._updateView();
                this._loadSettings();
                break;
            case 'openChat':
                this._currentView = 'chat';
                this._updateView();
                this._restoreChatHistory(); // Restore chat history when returning to chat
                break;
            case 'saveSettings':
                await this.settingsManager.saveSettings(message.settings);
                vscode.window.showInformationMessage('Settings saved successfully!');
                break;
            case 'loadSettings':
                this._loadSettings();
                break;
            case 'sendMessage':
                await this._handleChatMessage(message.text, webviewView);
                break;
            case 'clearHistory':
                this.ollamaService.clearHistory();
                this._chatHistory = []; // Clear stored history
                webviewView.webview.postMessage({ command: 'clearMessages' });
                vscode.window.showInformationMessage('Conversation history cleared.');
                break;
        }
    }

    private async _handleChatMessage(text: string, webviewView: vscode.WebviewView) {
        try {
            // Store user message in history
            this._chatHistory.push({ message: `You: ${text}`, sender: 'user' });

            const settings = this.settingsManager.loadSettings();
            const response = await this.ollamaService.sendChatMessage(text, settings.endpoint, settings.model);
            
            // Parse the structured response
            const parsedResponse = this._parseStructuredResponse(response);
            
            // Store the context for next request
            if (parsedResponse?.context) {
                this.ollamaService.setContext(parsedResponse.context);
            }
            
            // Execute actions if present
            let actionResults = '';
            if (parsedResponse?.actions) {
                actionResults = await this._executeActions(parsedResponse.actions);
            }

            const assistantMessage = this._formatStructuredResponse(parsedResponse, response) + 
                (actionResults ? `\n\n**Action Results:**\n${actionResults}` : '');

            // Store assistant response in history
            this._chatHistory.push({ message: assistantMessage, sender: 'assistant' });

            webviewView.webview.postMessage({
                command: 'addMessage',
                text: assistantMessage
            });

        } catch (error) {
            const isOllamaRunning = await this.ollamaService.checkStatus();
            
            let errorMessage = 'Unknown error occurred';
            if (error instanceof Error) {
                if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
                    errorMessage = isOllamaRunning ? 
                        'Cannot connect to Ollama. Check your endpoint URL.' : 
                        'Ollama is not running. Please start Ollama first.';
                } else {
                    errorMessage = error.message;
                }
            }

            const fullErrorMessage = `Error: ${errorMessage}`;
            
            // Store error in history
            this._chatHistory.push({ message: fullErrorMessage, sender: 'assistant' });

            webviewView.webview.postMessage({
                command: 'addMessage',
                text: fullErrorMessage
            });

            if (!isOllamaRunning) {
                this.statusHandler.showOllamaStatusMessage(false);
            }
        }
    }

    private _restoreChatHistory() {
        if (this._view && this._chatHistory.length > 0) {
            // Send all stored messages to restore chat history
            this._view.webview.postMessage({
                command: 'restoreHistory',
                history: this._chatHistory
            });
        }
    }

    private _updateView() {
        console.log('_updateView called, current view:', this._currentView);
        console.log('_view exists:', !!this._view);
        console.log('htmlProvider exists:', !!this.htmlProvider);
        
        if (this._view && this.htmlProvider) {
            let html: string;
            if (this._currentView === 'chat') {
                html = this.htmlProvider.getChatHtml();
                console.log('Generated chat HTML length:', html.length);
            } else {
                html = this.htmlProvider.getSettingsHtml();
                console.log('Generated settings HTML length:', html.length);
            }
            this._view.webview.html = html;
            console.log('HTML set to webview');
        } else {
            console.log('Cannot update view - missing dependencies');
        }
    }

    private _loadSettings() {
        const settings = this.settingsManager.loadSettings();
        this._view?.webview.postMessage({
            command: 'loadSettings',
            settings: settings
        });
    }

    private async _executeActions(actions: Array<{type: string, params: any}>): Promise<string> {
        let actionResults = '';
        
        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'list_files':
                        const files = await this._listFiles(action.params.directory, action.params.extensions);
                        actionResults += `Files found: ${files.join(', ')}\n`;
                        break;
                    case 'get_file':
                        const fileContent = await this._getFileContent(action.params.path);
                        actionResults += `File content (${action.params.path}):\n\`\`\`\n${fileContent}\n\`\`\`\n`;
                        break;
                    default:
                        actionResults += `Unknown action: ${action.type}\n`;
                }
            } catch (error) {
                actionResults += `Error executing ${action.type}: ${error}\n`;
            }
        }
        
        return actionResults;
    }

    private async _listFiles(directory: string, extensions: string[]): Promise<string[]> {
        // Implement file listing logic using VS Code workspace APIs
        const files = await vscode.workspace.findFiles(`${directory}/**/*{${extensions.join(',')}}`);
        return files.map(file => file.fsPath);
    }

    private async _getFileContent(path: string): Promise<string> {
        // Implement file reading logic
        const uri = vscode.Uri.file(path);
        const document = await vscode.workspace.openTextDocument(uri);
        return document.getText();
    }

    private _parseStructuredResponse(response: string): LlamaResponse | null {
        try {
            console.log('Raw response from Ollama:', response);
            
            // Try multiple patterns for JSON extraction
            const patterns = [
                /```json\s*([\s\S]*?)\s*```/i,
                /```JSON\s*([\s\S]*?)\s*```/i,
                /```\s*{\s*[\s\S]*?}\s*```/,
                /{\s*"[\s\S]*?}/
            ];

            for (const pattern of patterns) {
                const match = response.match(pattern);
                if (match) {
                    let jsonString = match[1] || match[0];
                    
                    // Clean up the JSON string
                    jsonString = jsonString.trim();
                    
                    // Remove any markdown artifacts
                    if (jsonString.startsWith('```')) {
                        jsonString = jsonString.replace(/^```[a-zA-Z]*\s*/, '').replace(/```$/, '');
                    }
                    
                    console.log('Attempting to parse JSON:', jsonString);
                    
                    try {
                        const parsed = JSON.parse(jsonString) as LlamaResponse;
                        console.log('Successfully parsed JSON:', parsed);
                        return parsed;
                    } catch (parseError) {
                        console.error('Parse error for pattern:', pattern, parseError);
                        continue;
                    }
                }
            }
            
            console.log('No valid JSON found in response');
            return null;
        } catch (error) {
            console.error('Failed to parse JSON response:', error);
            return null;
        }
    }

    private _formatStructuredResponse(parsedResponse: LlamaResponse | null, originalResponse: string): string {
        if (!parsedResponse) {
            console.log('Using original response (parsing failed)');
            // Return original response if parsing failed, but clean it up a bit
            return originalResponse.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
        }

        console.log('Formatting structured response:', parsedResponse);
        
        let formattedResponse = '';

        // Add details section
        if (parsedResponse.details) {
            formattedResponse += `${parsedResponse.details}\n\n`;
        }

        // Add code examples
        if (parsedResponse.code && parsedResponse.code.length > 0) {
            parsedResponse.code.forEach((codeBlock, index) => {
                formattedResponse += `**Code Example ${index + 1}:**\n`;
                formattedResponse += `\`\`\`${codeBlock.language}\n${codeBlock.content}\n\`\`\`\n\n`;
            });
        }

        // Add summary
        if (parsedResponse.summary) {
            formattedResponse += `**Summary:** ${parsedResponse.summary}\n\n`;
        }

        // Add questions
        if (parsedResponse.questions && parsedResponse.questions.length > 0) {
            formattedResponse += `**Follow-up Questions:**\n`;
            parsedResponse.questions.forEach((question, index) => {
                formattedResponse += `${index + 1}. ${question}\n`;
            });
            formattedResponse += '\n';
        }

        // Handle actions (don't display context - it's stored internally)
        if (parsedResponse.actions && parsedResponse.actions.length > 0) {
            formattedResponse += `**Suggested Actions:**\n`;
            parsedResponse.actions.forEach((action, index) => {
                formattedResponse += `${index + 1}. ${action.type}: ${JSON.stringify(action.params)}\n`;
            });
            formattedResponse += '\n';
        }

        const result = formattedResponse.trim() || originalResponse;
        console.log('Final formatted response:', result);
        return result;
    }
}