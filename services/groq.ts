import { Groq } from 'groq-sdk';
import type { ChatMessage, AIService } from '../types';

const groq = new Groq();

function findTag(value: string, tag: string) {
    return value.toLowerCase().indexOf(tag);
}

function partialTagLength(value: string, tag: string) {
    const lowerValue = value.toLowerCase();
    for (let length = Math.min(tag.length - 1, lowerValue.length); length > 0; length--) {
        if (tag.startsWith(lowerValue.slice(-length))) {
            return length;
        }
    }
    return 0;
}

export const groqService: AIService = {
    name: 'Groq',
    async chat(messages: ChatMessage[]){
        const chatCompletion = await groq.chat.completions.create({
        messages,
        model: "qwen/qwen3-32b",
        temperature: 0.6,
        max_completion_tokens: 1200,
        top_p: 0.95,
        stream: true,
        reasoning_effort: "default",
        stop: null
        });
        return async function* () {
            let buffer = '';
            let insideThinkBlock = false;

            for await (const chunk of chatCompletion) {
                buffer += chunk.choices[0]?.delta?.content || '';

                while (buffer) {
                    if (insideThinkBlock) {
                        const endIndex = findTag(buffer, '</think>');
                        if (endIndex === -1) {
                            buffer = buffer.slice(-'</think>'.length + 1);
                            break;
                        }

                        buffer = buffer.slice(endIndex + '</think>'.length);
                        insideThinkBlock = false;
                        continue;
                    }

                    const startIndex = findTag(buffer, '<think>');
                    if (startIndex === -1) {
                        const keepLength = partialTagLength(buffer, '<think>');
                        const text = buffer.slice(0, buffer.length - keepLength);
                        if (text) {
                            yield text;
                        }
                        buffer = buffer.slice(buffer.length - keepLength);
                        break;
                    }

                    const text = buffer.slice(0, startIndex);
                    if (text) {
                        yield text;
                    }
                    buffer = buffer.slice(startIndex + '<think>'.length);
                    insideThinkBlock = true;
                }
            }

            if (!insideThinkBlock && buffer) {
                yield buffer;
            }
        }()
        
    }
}

