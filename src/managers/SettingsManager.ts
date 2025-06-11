import * as vscode from 'vscode';
import { ChatSettings } from '../types/Settings';

export class SettingsManager {
    async saveSettings(settings: ChatSettings): Promise<void> {
        const config = vscode.workspace.getConfiguration('chattyllama');
        await config.update('model', settings.model, vscode.ConfigurationTarget.Global);
        await config.update('endpoint', settings.endpoint, vscode.ConfigurationTarget.Global);
    }

    loadSettings(): ChatSettings {
        const config = vscode.workspace.getConfiguration('chattyllama');
        return {
            model: config.get<string>('model', 'code-helper'),
            endpoint: config.get<string>('endpoint', 'http://localhost:11434')
        };
    }
}