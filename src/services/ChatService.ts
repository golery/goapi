import { GoogleGenerativeAI } from '@google/generative-ai';
import { Node } from '../entity/Node';
import { ChatMessage } from '../types/schemas';
import logger from '../utils/logger';

export class ChatService {
    private genAI: GoogleGenerativeAI | null = null;

    private getGenAI(): GoogleGenerativeAI {
        // Lazy initialization to ensure env vars are loaded from .env file
        if (!this.genAI) {
            const apiKey = process.env.GEMINI_API_KEY;
            if (apiKey) {
                this.genAI = new GoogleGenerativeAI(apiKey);
            } else {
                logger.warn('GEMINI_API_KEY not set. Chat functionality will not work.');
                throw new Error('Gemini API key not configured');
            }
        }
        return this.genAI;
    }

    private formatNodeContent(nodes: Node[]): string {
        if (nodes.length === 0) {
            return 'No node content available.';
        }

        return nodes
            .map((node) => {
                const parts: string[] = [];
                parts.push(`Node ID: ${node.id}`);
                if (node.name) parts.push(`Name: ${node.name}`);
                if (node.text) parts.push(`Text: ${node.text}`);
                if (node.title) parts.push(`Title: ${node.title}`);
                if (node.data) {
                    parts.push(`Data: ${JSON.stringify(node.data)}`);
                }
                if (node.children && node.children.length > 0) {
                    parts.push(`Children: ${node.children.join(', ')}`);
                } else {
                    parts.push(`Children: None`);
                }
                return parts.join('\n');
            })
            .join('\n---\n');
    }

    async *streamChatResponse(
        question: string,
        nodes: Node[],
        chatHistory?: ChatMessage[],
    ): AsyncGenerator<string> {
        const genAI = this.getGenAI();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

        // Format node content
        const nodeContent = this.formatNodeContent(nodes);

        // Build conversation history
        const history: Array<{ role: string; parts: Array<{ text: string }> }> = [];

        // Add system context with node content
        const systemMessage = `You are helping the user understand the following node content:\n\n${nodeContent}\n\nPlease answer questions about this content clearly and concisely.`;

        // Add chat history if provided
        if (chatHistory && chatHistory.length > 0) {
            for (const msg of chatHistory) {
                if (msg.role === 'user') {
                    history.push({ role: 'user', parts: [{ text: msg.content }] });
                } else if (msg.role === 'assistant') {
                    history.push({ role: 'model', parts: [{ text: msg.content }] });
                }
            }
        }

        // Start chat with history (without systemInstruction - include it in the first message instead)
        const chat = model.startChat({
            history: history.length > 0 ? history : undefined,
        });

        // For the first message in a conversation, include the system context
        // For follow-up questions, the context should already be in the conversation
        const fullQuestion = history.length === 0 
            ? `${systemMessage}\n\nUser question: ${question}`
            : question;

        // Send the question and stream the response
        const result = await chat.sendMessageStream(fullQuestion);

        // Stream chunks
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                yield chunkText;
            }
        }
    }
}

