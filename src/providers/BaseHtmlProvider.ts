import * as vscode from 'vscode';

export abstract class BaseHtmlProvider {
    constructor(
        protected readonly _extensionUri: vscode.Uri, 
        protected readonly _webview: vscode.Webview
    ) {}

    protected getStyleUri(filename: string): vscode.Uri {
        return this._webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'src', 'styles', filename)
        );
    }

    protected getCommonHeadContent(title: string, cssFilename: string): string {
        const styleUri = this.getStyleUri(cssFilename);
        
        return `
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <link rel="stylesheet" type="text/css" href="${styleUri}">
            <style>
                html, body {
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* Internet Explorer and Edge */
                }
                html::-webkit-scrollbar, body::-webkit-scrollbar {
                    display: none;
                }
            </style>
        `;
    }

    protected wrapInHtmlDocument(headContent: string, bodyContent: string): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            ${headContent}
        </head>
        <body>
            ${bodyContent}
        </body>
        </html>`;
    }

    abstract getHtml(): string;
}