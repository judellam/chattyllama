export const UI_CONSTANTS = {
    TITLES: {
        CHAT: 'ChattyLlama',
        SETTINGS: 'ChattyLlama Settings'
    },
    COMMANDS: {
        SEND_MESSAGE: 'sendMessage',
        OPEN_SETTINGS: 'openSettings',
        CLEAR_HISTORY: 'clearHistory',
        BACK: 'back',
        SAVE_SETTINGS: 'saveSettings',
        LOAD_SETTINGS: 'loadSettings',
        ANALYZE_WORKSPACE: 'analyzeWorkspace',
        ADD_MESSAGE: 'addMessage',
        CLEAR_MESSAGES: 'clearMessages',
        RESTORE_HISTORY: 'restoreHistory',
        SETTINGS_LOADED: 'settingsLoaded',
        ANALYSIS_COMPLETE: 'analysisComplete'
    },
    PLACEHOLDERS: {
        MESSAGE_INPUT: 'Type your message...',
        OLLAMA_URL: 'http://localhost:11434'
    },
    BUTTON_TEXT: {
        SEND: '→',
        SETTINGS: '⚙️',
        CLEAR: '🗑️',
        BACK: '←',
        SAVE_SETTINGS: 'Save Settings',
        ANALYZE_WORKSPACE: '📁 Analyze Workspace Files',
        ANALYZING: '🔄 Analyzing...'
    },
    TOOLTIPS: {
        SEND: 'Send message',
        SETTINGS: 'Open Settings',
        CLEAR: 'Clear Conversation',
        COPY: 'Copy code'
    },
    WELCOME_MESSAGE: 'Welcome to ChattyLlama! Type a message below.',
    DESCRIPTIONS: {
        OLLAMA_URL: 'The URL where your Ollama server is running',
        MODEL: 'Choose the AI model to use for responses',
        ANALYZE_WORKSPACE: 'Recursively analyze all files in the workspace and generate summaries'
    }
};

export const MODEL_OPTIONS = [
    { value: 'llama2', label: 'Llama 2' },
    { value: 'codellama', label: 'Code Llama' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'neural-chat', label: 'Neural Chat' }
];