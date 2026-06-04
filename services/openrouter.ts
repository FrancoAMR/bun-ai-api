import { OpenRouter } from '@openrouter/sdk';
import type { ChatMessage, AIService } from '../types';

const openrouter = new OpenRouter();

export const openrouterService: AIService = {
    name: 'OpenRouter',
    async chat(messages: ChatMessage[]){
        const stream = await openrouter.chat.send({
            chatRequest: {
                messages: messages as any,
                model: 'meta-llama/llama-3.3-70b-instruct:free',
                stream: true
            }
        });
        return async function* () {
            for await (const chunk of stream) {
                yield (chunk as any).choices[0]?.delta?.content || '';
            }
        }()
    }
}
