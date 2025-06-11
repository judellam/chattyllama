import * as vscode from 'vscode';
import { BaseHtmlProvider } from './BaseHtmlProvider';
import { UI_CONSTANTS } from '../constants/ui';

export class ChatHtmlProvider extends BaseHtmlProvider {
    constructor(extensionUri: vscode.Uri, webview: vscode.Webview) {
        super(extensionUri, webview);
    }

    getHtml(): string {
        const headContent = this.getCommonHeadContent(UI_CONSTANTS.TITLES.CHAT, 'chat.css');
        const bodyContent = this.getChatBodyContent();
        
        return this.wrapInHtmlDocument(headContent, bodyContent);
    }

    private getChatBodyContent(): string {
        return `
            <div class="chat-container">
                <div class="header">
                    <div class="left-header">
                        <button class="settings-icon" id="settingsButton" title="${UI_CONSTANTS.TOOLTIPS.SETTINGS}">${UI_CONSTANTS.BUTTON_TEXT.SETTINGS}</button>
                        <button class="clear-icon" id="clearButton" title="${UI_CONSTANTS.TOOLTIPS.CLEAR}">${UI_CONSTANTS.BUTTON_TEXT.CLEAR}</button>
                        <div class="title">Chat</div>
                    </div>
                </div>
                <div class="messages" id="messages">
                    <div class="message welcome">${UI_CONSTANTS.WELCOME_MESSAGE}</div>
                </div>
                <div class="input-container">
                    <div class="input-wrapper">
                        <input type="text" id="messageInput" placeholder="${UI_CONSTANTS.PLACEHOLDERS.MESSAGE_INPUT}" />
                        <button id="sendButton" title="${UI_CONSTANTS.TOOLTIPS.SEND}">${UI_CONSTANTS.BUTTON_TEXT.SEND}</button>
                    </div>
                </div>
            </div>
            ${this.getChatScript()}
        `;
    }

    private getChatScript(): string {
        return `<script>
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
                        command: '${UI_CONSTANTS.COMMANDS.SEND_MESSAGE}',
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
                    const avatar = document.createElement('div');
                    avatar.className = 'message-avatar';
                    avatar.textContent = '👤';
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'message-content';
                    contentDiv.innerHTML = escapeHtml(message.replace('You: ', ''));
                    
                    messageDiv.appendChild(avatar);
                    messageDiv.appendChild(contentDiv);
                } else {
                    messageDiv.innerHTML = formatAssistantMessage(message);
                }
                
                messagesContainer.appendChild(messageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }

            ${this.getFormatAssistantMessageFunction()}
            ${this.getCopyCodeFunction()}
            ${this.getHistoryFunctions()}
            ${this.getEventListeners()}
        </script>`;
    }

    private getFormatAssistantMessageFunction(): string {
        return `
            function formatAssistantMessage(message) {
                let formattedHtml = '';
                const sections = message.split('\\\\n\\\\n');
                
                for (let section of sections) {
                    section = section.trim();
                    if (!section) continue;
                    
                    if (section.startsWith('**Code Example')) {
                        const lines = section.split('\\\\n');
                        const title = lines[0];
                        const codeMatch = section.match(/\\\`\\\`\\\`(\\\\w+)?\\\\n?([\\\\s\\\\S]*?)\\\`\\\`\\\`/);
                        
                        if (codeMatch) {
                            const language = codeMatch[1] || 'text';
                            const code = codeMatch[2].trim();
                            const decodedCode = code.replace(/\\\\\\\\n/g, '\\\\n').replace(/\\\\n/g, '\\\\n');
                            
                            formattedHtml += \\\`
                                <div class="code-section">
                                    <div class="code-title">\\\${escapeHtml(title)}</div>
                                    <div class="code-block">
                                        <div class="code-header">
                                            <span class="language">\\\${language}</span>
                                            <button class="copy-btn" onclick="copyCode(this)" title="${UI_CONSTANTS.TOOLTIPS.COPY}">📋</button>
                                        </div>
                                        <pre><code class="language-\\\${language}">\\\${escapeHtml(decodedCode)}</code></pre>
                                    </div>
                                </div>
                            \\\`;
                        }
                    } else if (section.startsWith('**Summary:**')) {
                        const summaryText = section.replace('**Summary:**', '').trim();
                        formattedHtml += \\\`
                            <div class="summary-section">
                                <div class="section-title">Summary</div>
                                <div class="summary-content">\\\${escapeHtml(summaryText)}</div>
                            </div>
                        \\\`;
                    } else {
                        let processedContent = section;
                        processedContent = processedContent.replace(/\\\`([^\\\`]+)\\\`/g, '<code class="inline-code">$1</code>');
                        processedContent = processedContent.replace(/\\\`\\\`\\\`(\\\\w+)?\\\\n?([\\\\s\\\\S]*?)\\\`\\\`\\\`/g, (match, lang, code) => {
                            const decodedCode = code.replace(/\\\\\\\\n/g, '\\\\n').replace(/\\\\n/g, '\\\\n').trim();
                            return \\\`<pre class="code-block"><code class="language-\\\${lang || 'text'}">\\\${escapeHtml(decodedCode)}</code></pre>\\\`;
                        });
                        processedContent = processedContent.replace(/\\\\n/g, '<br>');
                        
                        formattedHtml += \\\`
                            <div class="content-section">
                                <div class="content">\\\${processedContent}</div>
                            </div>
                        \\\`;
                    }
                }
                
                return formattedHtml;
            }
        `;
    }

    private getCopyCodeFunction(): string {
        return `
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
        `;
    }

    private getHistoryFunctions(): string {
        return `
            function restoreHistory(history) {
                clearMessages();
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
                    if (index > 0) {
                        msg.remove();
                    }
                });
            }
        `;
    }

    private getEventListeners(): string {
        return `
            sendButton.addEventListener('click', sendMessage);
            messageInput.addEventListener('input', updateSendButton);
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });

            settingsButton.addEventListener('click', () => {
                vscode.postMessage({
                    command: '${UI_CONSTANTS.COMMANDS.OPEN_SETTINGS}'
                });
            });

            clearButton.addEventListener('click', () => {
                vscode.postMessage({
                    command: '${UI_CONSTANTS.COMMANDS.CLEAR_HISTORY}'
                });
            });

            updateSendButton();

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case '${UI_CONSTANTS.COMMANDS.ADD_MESSAGE}':
                        addMessageToChat(message.text, 'assistant');
                        break;
                    case '${UI_CONSTANTS.COMMANDS.CLEAR_MESSAGES}':
                        clearMessages();
                        break;
                    case '${UI_CONSTANTS.COMMANDS.RESTORE_HISTORY}':
                        restoreHistory(message.history);
                        break;
                }
            });
        `;
    }
}