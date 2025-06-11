import * as vscode from 'vscode';
import { ChatHtmlProvider } from './ChatHtmlProvider';
import { SettingsHtmlProvider } from './SettingsHtmlProvider';

export class HtmlProvider {
    private chatProvider: ChatHtmlProvider;
    private settingsProvider: SettingsHtmlProvider;

    constructor(private readonly _extensionUri: vscode.Uri, private readonly _webview: vscode.Webview) {
        this.chatProvider = new ChatHtmlProvider(_extensionUri, _webview);
        this.settingsProvider = new SettingsHtmlProvider(_extensionUri, _webview);
    }

    getChatHtml(): string {
        return this.chatProvider.getHtml();
    }

    getSettingsHtml(): string {
        return this.settingsProvider.getHtml();
    }
}