import * as vscode from 'vscode';

export class HtmlProvider {
    constructor(private readonly _extensionUri: vscode.Uri, private readonly _webview: vscode.Webview) {}

    getChatHtml(): string {
        const styleUri = this._webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'src', 'styles', 'chat.css')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ChattyLlama</title>
            <link rel="stylesheet" type="text/css" href="${styleUri}">
            <style>
                html, body {
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* Internet Explorer and Edge */
                }
                html::-webkit-scrollbar, body::-webkit-scrollbar {
                    display: none;
                }
            </style>
        </head>
        <body>
            <div class="chat-container">
                <div class="header">
                    <div class="left-header">
                        <button class="settings-icon" id="settingsButton" title="Open Settings">⚙️</button>
                        <button class="clear-icon" id="clearButton" title="Clear Conversation">🗑️</button>
                        <div class="title">Chat</div>
                    </div>
                </div>
                <div class="messages" id="messages">
                    <div class="message welcome">Welcome to ChattyLlama! Type a message below.</div>
                </div>
                <div class="input-container">
                    <div class="input-wrapper">
                        <input type="text" id="messageInput" placeholder="Type your message..." />
                        <button id="sendButton" title="Send message">→</button>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const messageInput = document.getElementById('messageInput');
                const sendButton = document.getElementById('sendButton');
                const settingsButton = document.getElementById('settingsButton');
                const clearButton = document.getElementById('clearButton');
                const messagesContainer = document.getElementById('messages');

                function sendMessage() {
                    const text = messageInput.value.trim();
                    if (text) {
                        addMessageToChat('You: ' + text, 'user');
                        vscode.postMessage({
                            command: 'sendMessage',
                            text: text
                        });
                        messageInput.value = '';
                        updateSendButton();
                    }
                }

                function updateSendButton() {
                    const hasText = messageInput.value.trim().length > 0;
                    sendButton.disabled = !hasText;
                }

                function escapeHtml(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }

                function addMessageToChat(message, sender = 'assistant') {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = \`message \${sender}\`;
                    
                    if (sender === 'user') {
                        // User messages: add avatar + content
                        const avatar = document.createElement('div');
                        avatar.className = 'message-avatar';
                        avatar.textContent = '👤'; // User icon
                        
                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'message-content';
                        contentDiv.innerHTML = escapeHtml(message.replace('You: ', ''));
                        
                        messageDiv.appendChild(avatar);
                        messageDiv.appendChild(contentDiv);
                    } else {
                        // Assistant messages: keep exactly as they were
                        messageDiv.innerHTML = formatAssistantMessage(message);
                    }
                    
                    messagesContainer.appendChild(messageDiv);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }

                function formatAssistantMessage(message) {
                    let formattedHtml = '';
                    
                    // Split message into sections
                    const sections = message.split('\\n\\n');
                    
                    for (let section of sections) {
                        section = section.trim();
                        if (!section) continue;
                        
                        if (section.startsWith('**Code Example')) {
                            // Handle code examples
                            const lines = section.split('\\n');
                            const title = lines[0];
                            const codeMatch = section.match(/\`\`\`(\\w+)?\\n?([\\s\\S]*?)\`\`\`/);
                            
                            if (codeMatch) {
                                const language = codeMatch[1] || 'text';
                                const code = codeMatch[2].trim();
                                // Fix: Properly decode escaped newlines
                                const decodedCode = code.replace(/\\\\n/g, '\\n').replace(/\\n/g, '\\n');
                                
                                formattedHtml += \`
                                    <div class="code-section">
                                        <div class="code-title">\${escapeHtml(title)}</div>
                                        <div class="code-block">
                                            <div class="code-header">
                                                <span class="language">\${language}</span>
                                                <button class="copy-btn" onclick="copyCode(this)" title="Copy code">📋</button>
                                            </div>
                                            <pre><code class="language-\${language}">\${escapeHtml(decodedCode)}</code></pre>
                                        </div>
                                    </div>
                                \`;
                            }
                        } else if (section.startsWith('**Summary:**')) {
                            // Handle summary
                            const summaryText = section.replace('**Summary:**', '').trim();
                            formattedHtml += \`
                                <div class="summary-section">
                                    <div class="section-title">Summary</div>
                                    <div class="summary-content">\${escapeHtml(summaryText)}</div>
                                </div>
                            \`;
                        } else {
                            // Handle regular content (details section)
                            let processedContent = section;
                            
                            // Parse inline code
                            processedContent = processedContent.replace(/\`([^\`]+)\`/g, '<code class="inline-code">$1</code>');
                            
                            // Parse code blocks with proper newline handling
                            processedContent = processedContent.replace(/\`\`\`(\\w+)?\\n?([\\s\\S]*?)\`\`\`/g, (match, lang, code) => {
                                const decodedCode = code.replace(/\\\\n/g, '\\n').replace(/\\n/g, '\\n').trim();
                                return \`<pre class="code-block"><code class="language-\${lang || 'text'}">\${escapeHtml(decodedCode)}</code></pre>\`;
                            });
                            
                            // Convert line breaks to <br>
                            processedContent = processedContent.replace(/\\n/g, '<br>');
                            
                            formattedHtml += \`
                                <div class="content-section">
                                    <div class="content">\${processedContent}</div>
                                </div>
                            \`;
                        }
                    }
                    
                    return formattedHtml;
                }

                function copyCode(button) {
                    const codeElement = button.closest('.code-block').querySelector('code');
                    const text = codeElement.textContent;
                    
                    navigator.clipboard.writeText(text).then(() => {
                        button.textContent = '✅';
                        setTimeout(() => {
                            button.textContent = '📋';
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy code:', err);
                    });
                }

                function restoreHistory(history) {
                    // Clear existing messages except welcome
                    clearMessages();
                    
                    // Restore all messages from history
                    history.forEach(item => {
                        if (item.sender === 'user') {
                            addMessageToChat(item.message, 'user');
                        } else {
                            addMessageToChat(item.message, 'assistant');
                        }
                    });
                }

                function clearMessages() {
                    const messages = messagesContainer.querySelectorAll('.message');
                    messages.forEach((msg, index) => {
                        if (index > 0) { // Keep the welcome message
                            msg.remove();
                        }
                    });
                }

                sendButton.addEventListener('click', sendMessage);
                messageInput.addEventListener('input', updateSendButton);
                messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        sendMessage();
                    }
                });

                settingsButton.addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'openSettings'
                    });
                });

                clearButton.addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'clearHistory'
                    });
                });

                updateSendButton();

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'addMessage':
                            addMessageToChat(message.text, 'assistant');
                            break;
                        case 'clearMessages':
                            clearMessages();
                            break;
                        case 'restoreHistory':
                            restoreHistory(message.history);
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
    }

    getSettingsHtml(): string {
        const styleUri = this._webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'src', 'styles', 'settings.css')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ChattyLlama Settings</title>
            <link rel="stylesheet" type="text/css" href="${styleUri}">
            <style>
                html, body {
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* Internet Explorer and Edge */
                }
                html::-webkit-scrollbar, body::-webkit-scrollbar {
                    display: none;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <button class="back-button" id="backButton">←</button>
                <div class="title">Settings</div>
            </div>
            
            <div class="setting-group">
                <label for="ollamaUrl">Ollama URL:</label>
                <input type="text" id="ollamaUrl" placeholder="http://localhost:11434">
                <div class="description">The URL where your Ollama server is running</div>
            </div>
            
            <div class="setting-group">
                <label for="model">Model:</label>
                <select id="model">
                    <option value="llama2">Llama 2</option>
                    <option value="codellama">Code Llama</option>
                    <option value="mistral">Mistral</option>
                    <option value="neural-chat">Neural Chat</option>
                </select>
                <div class="description">Choose the AI model to use for responses</div>
            </div>
            
            <button id="saveButton">Save Settings</button>

            <div class="actions-section">
                <h3>Actions</h3>
                <button class="action-button" id="analyzeWorkspaceButton">
                    📁 Analyze Workspace Files
                </button>
                <div class="description">Recursively analyze all files in the workspace and generate summaries</div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                document.getElementById('backButton').addEventListener('click', () => {
                    vscode.postMessage({ command: 'back' });
                });
                
                document.getElementById('saveButton').addEventListener('click', () => {
                    const settings = {
                        ollamaUrl: document.getElementById('ollamaUrl').value,
                        model: document.getElementById('model').value
                    };
                    vscode.postMessage({ command: 'saveSettings', settings });
                });

                document.getElementById('analyzeWorkspaceButton').addEventListener('click', () => {
                    const button = document.getElementById('analyzeWorkspaceButton');
                    button.disabled = true;
                    button.textContent = '🔄 Analyzing...';
                    vscode.postMessage({ command: 'analyzeWorkspace' });
                });
                
                // Load current settings
                vscode.postMessage({ command: 'loadSettings' });
                
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'settingsLoaded':
                            document.getElementById('ollamaUrl').value = message.settings.ollamaUrl || 'http://localhost:11434';
                            document.getElementById('model').value = message.settings.model || 'llama2';
                            break;
                        case 'analysisComplete':
                            const button = document.getElementById('analyzeWorkspaceButton');
                            button.disabled = false;
                            button.textContent = '📁 Analyze Workspace Files';
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
    }
}