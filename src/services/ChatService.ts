import OpenAI from 'openai';
import { Node } from '../entity/Node';
import { ChatMessage } from '../types/schemas';
import logger from '../utils/logger';

export class ChatService {
    private openai: OpenAI | null = null;

    private getOpenAI(): OpenAI {
        // Lazy initialization to ensure env vars are loaded from .env file
        if (!this.openai) {
            const apiKey = process.env.GROQ_API_KEY;
            if (apiKey) {
                this.openai = new OpenAI({
                    apiKey,
                    baseURL: 'https://api.groq.com/openai/v1',
                });
            } else {
                logger.warn('GROQ_API_KEY not set. Chat functionality will not work.');
                throw new Error('Groq API key not configured');
            }
        }
        return this.openai;
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
        const openai = this.getOpenAI();
        const llmModel = 'llama-3.3-70b-versatile';

        // Format node content
        const nodeContent = this.formatNodeContent(nodes);

        // Build messages
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

        // Add system context with node content
        messages.push({
            role: 'system',
            content: `You are helping the user understand the following node content:\n\n${nodeContent}\n\nPlease answer questions about this content clearly and concisely.`,
        });

        // Add chat history if provided
        if (chatHistory && chatHistory.length > 0) {
            for (const msg of chatHistory) {
                messages.push({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.content,
                });
            }
        }

        // Add current question
        messages.push({
            role: 'user',
            content: question,
        });

        // Send the question and stream the response
        try {
            const stream = await openai.chat.completions.create({
                model: llmModel,
                messages: messages,
                stream: true,
            });

            // Stream chunks
            for await (const chunk of stream) {
                const chunkText = chunk.choices[0]?.delta?.content || '';
                if (chunkText) {
                    yield chunkText;
                }
            }
        } catch (error: any) {
            logger.error('Error in Groq chat completion:', error);
            throw error;
        }
    }
}

