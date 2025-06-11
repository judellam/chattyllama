export interface LlamaResponse {
    details?: string;
    code?: Array<{
        content: string;
        language: string;
    }>;
    summary?: string;
    questions?: string[];
    context?: string;
    actions?: Array<{
        type: string;
        params: any;
    }>;
}

export interface CodeBlock {
    content: string;
    language: string;
}

export interface LlamaAction {
    type: string;
    params: any;
}