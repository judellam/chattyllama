export interface ChatMessage {
    message: string;
    sender: 'user' | 'assistant';
}

export type ChatHistory = ChatMessage[];