import * as vscode from 'vscode';
import { BaseHtmlProvider } from './BaseHtmlProvider';
import { UI_CONSTANTS, MODEL_OPTIONS } from '../constants/ui';

export class SettingsHtmlProvider extends BaseHtmlProvider {
    constructor(extensionUri: vscode.Uri, webview: vscode.Webview) {
        super(extensionUri, webview);
    }

    getHtml(): string {
        const headContent = this.getCommonHeadContent(UI_CONSTANTS.TITLES.SETTINGS, 'settings.css');
        const bodyContent = this.getSettingsBodyContent();
        
        return this.wrapInHtmlDocument(headContent, bodyContent);
    }

    private getSettingsBodyContent(): string {
        return `
            <div class="header">
                <button class="back-button" id="backButton">${UI_CONSTANTS.BUTTON_TEXT.BACK}</button>
                <div class="title">Settings</div>
            </div>
            
            <div class="setting-group">
                <label for="ollamaUrl">Ollama URL:</label>
                <input type="text" id="ollamaUrl" placeholder="${UI_CONSTANTS.PLACEHOLDERS.OLLAMA_URL}">
                <div class="description">${UI_CONSTANTS.DESCRIPTIONS.OLLAMA_URL}</div>
            </div>
            
            <div class="setting-group">
                <label for="model">Model:</label>
                <select id="model">
                    ${this.getModelOptions()}
                </select>
                <div class="description">${UI_CONSTANTS.DESCRIPTIONS.MODEL}</div>
            </div>
            
            <button id="saveButton">${UI_CONSTANTS.BUTTON_TEXT.SAVE_SETTINGS}</button>

            <div class="actions-section">
                <h3>Actions</h3>
                <button class="action-button" id="analyzeWorkspaceButton">
                    ${UI_CONSTANTS.BUTTON_TEXT.ANALYZE_WORKSPACE}
                </button>
                <div class="description">${UI_CONSTANTS.DESCRIPTIONS.ANALYZE_WORKSPACE}</div>
            </div>
            
            ${this.getSettingsScript()}
        `;
    }

    private getModelOptions(): string {
        return MODEL_OPTIONS.map(option => 
            `<option value="${option.value}">${option.label}</option>`
        ).join('');
    }

    private getSettingsScript(): string {
        return `<script>
            const vscode = acquireVsCodeApi();
            
            document.getElementById('backButton').addEventListener('click', () => {
                vscode.postMessage({ command: '${UI_CONSTANTS.COMMANDS.BACK}' });
            });
            
            document.getElementById('saveButton').addEventListener('click', () => {
                const settings = {
                    ollamaUrl: document.getElementById('ollamaUrl').value,
                    model: document.getElementById('model').value
                };
                vscode.postMessage({ command: '${UI_CONSTANTS.COMMANDS.SAVE_SETTINGS}', settings });
            });

            document.getElementById('analyzeWorkspaceButton').addEventListener('click', () => {
                const button = document.getElementById('analyzeWorkspaceButton');
                button.disabled = true;
                button.textContent = '${UI_CONSTANTS.BUTTON_TEXT.ANALYZING}';
                vscode.postMessage({ command: '${UI_CONSTANTS.COMMANDS.ANALYZE_WORKSPACE}' });
            });
            
            vscode.postMessage({ command: '${UI_CONSTANTS.COMMANDS.LOAD_SETTINGS}' });
            
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case '${UI_CONSTANTS.COMMANDS.SETTINGS_LOADED}':
                        document.getElementById('ollamaUrl').value = message.settings.ollamaUrl || '${UI_CONSTANTS.PLACEHOLDERS.OLLAMA_URL}';
                        document.getElementById('model').value = message.settings.model || 'llama2';
                        break;
                    case '${UI_CONSTANTS.COMMANDS.ANALYSIS_COMPLETE}':
                        const button = document.getElementById('analyzeWorkspaceButton');
                        button.disabled = false;
                        button.textContent = '${UI_CONSTANTS.BUTTON_TEXT.ANALYZE_WORKSPACE}';
                        break;
                }
            });
        </script>`;
    }
}