export interface OllamaChatResponse {
    message: {
        role: string;
        content: string;
    };
    done: boolean;
}

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
}