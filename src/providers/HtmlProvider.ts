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
                                
                                formattedHtml += \`
                                    <div class="code-section">
                                        <div class="code-title">\${escapeHtml(title)}</div>
                                        <div class="code-block">
                                            <div class="code-header">
                                                <span class="language">\${language}</span>
                                                <button class="copy-btn" onclick="copyCode(this)" title="Copy code">📋</button>
                                            </div>
                                            <pre><code class="language-\${language}">\${escapeHtml(code)}</code></pre>
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
                        } else if (section.startsWith('**Follow-up Questions:**')) {
                            // Handle questions
                            const lines = section.split('\\n').slice(1); // Skip the title
                            const questions = lines.filter(line => line.trim().match(/^\\d+\\./));
                            
                            if (questions.length > 0) {
                                formattedHtml += \`
                                    <div class="questions-section">
                                        <div class="section-title">Follow-up Questions</div>
                                        <ul class="questions-list">
                                \`;
                                
                                questions.forEach(question => {
                                    const cleanQuestion = question.replace(/^\\d+\\.\\s*/, '').trim();
                                    formattedHtml += \`<li>\${escapeHtml(cleanQuestion)}</li>\`;
                                });
                                
                                formattedHtml += \`
                                        </ul>
                                    </div>
                                \`;
                            }
                        } else if (section.startsWith('**Suggested Actions:**')) {
                            // Handle actions
                            const lines = section.split('\\n').slice(1);
                            const actions = lines.filter(line => line.trim().match(/^\\d+\\./));
                            
                            if (actions.length > 0) {
                                formattedHtml += \`
                                    <div class="actions-section">
                                        <div class="section-title">Suggested Actions</div>
                                        <ul class="actions-list">
                                \`;
                                
                                actions.forEach(action => {
                                    const cleanAction = action.replace(/^\\d+\\.\\s*/, '').trim();
                                    formattedHtml += \`<li><code>\${escapeHtml(cleanAction)}</code></li>\`;
                                });
                                
                                formattedHtml += \`
                                        </ul>
                                    </div>
                                \`;
                            }
                        } else if (section.startsWith('**Action Results:**')) {
                            // Handle action results
                            const resultText = section.replace('**Action Results:**', '').trim();
                            formattedHtml += \`
                                <div class="action-results-section">
                                    <div class="section-title">Action Results</div>
                                    <div class="action-results-content">
                                        <pre>\${escapeHtml(resultText)}</pre>
                                    </div>
                                </div>
                            \`;
                        } else {
                            // Handle regular content (details section)
                            // Parse inline code and regular markdown
                            let processedContent = section;
                            
                            // Parse inline code
                            processedContent = processedContent.replace(/\`([^\`]+)\`/g, '<code class="inline-code">$1</code>');
                            
                            // Parse code blocks
                            processedContent = processedContent.replace(/\`\`\`(\\w+)?\\n?([\\s\\S]*?)\`\`\`/g, (match, lang, code) => {
                                return \`<pre class="code-block"><code class="language-\${lang || 'text'}">\${escapeHtml(code.trim())}</code></pre>\`;
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
        </head>
        <body>
            <div class="header">
                <button class="back-button" id="backButton" title="Back to Chat">←</button>
                <div class="title">Settings</div>
            </div>
            
            <div class="setting-group">
                <label for="modelSelect">Model:</label>
                <select id="modelSelect">
                    <option value="code-helper">code-helper</option>
                    <option value="phi4">phi4</option>
                    <option value="llama3">llama3</option>
                    <option value="codellama">codellama</option>
                    <option value="mistral">mistral</option>
                    <option value="qwen">qwen</option>
                </select>
                <div class="description">Select the Ollama model to use for chat responses</div>
            </div>

            <div class="setting-group">
                <label for="endpointInput">Endpoint:</label>
                <input type="text" id="endpointInput" placeholder="http://localhost:11434" />
                <div class="description">Ollama server endpoint URL</div>
            </div>

            <button id="saveButton">Save Settings</button>

            <script>
                const vscode = acquireVsCodeApi();
                const modelSelect = document.getElementById('modelSelect');
                const endpointInput = document.getElementById('endpointInput');
                const saveButton = document.getElementById('saveButton');
                const backButton = document.getElementById('backButton');

                vscode.postMessage({ command: 'loadSettings' });

                saveButton.addEventListener('click', () => {
                    const settings = {
                        model: modelSelect.value,
                        endpoint: endpointInput.value
                    };
                    
                    vscode.postMessage({
                        command: 'saveSettings',
                        settings: settings
                    });
                });

                backButton.addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'openChat'
                    });
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'loadSettings':
                            modelSelect.value = message.settings.model;
                            endpointInput.value = message.settings.endpoint;
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
    }
}