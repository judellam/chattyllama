import * as vscode from 'vscode';
import { ChatPanelProvider } from './chatPanelProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "chattyllama" is now active!');

    // Register the webview provider for the sidebar
    const provider = new ChatPanelProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('chattyllama.chatView', provider)
    );

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand('chattyllama.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from ChattyLlama!');
    });

    context.subscriptions.push(disposable);
}
// This method is called when your extension is deactivated
export function deactivate() { }