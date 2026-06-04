import {groqService} from './services/groq';
import {cerebrasService} from './services/cerebras';
import {openrouterService} from './services/openrouter';
import type { AIService, ChatMessage } from './types';

const services: AIService[] = [
    groqService,
    cerebrasService,
    openrouterService,
]
let currentServiceIndex = 0;
const servicesBySession = new Map<string, AIService>();

// Rotate providers per request to spread traffic across available backends.
function getNextService(): AIService {
    if (services.length === 0) {
        throw new Error('No AI services configured');
    }

    const service = services[currentServiceIndex];
    currentServiceIndex = (currentServiceIndex + 1) % services.length;
    return service ?? services[0]!;
}

function getService(sessionId?: string): AIService {
    if (!sessionId) {
        return getNextService();
    }

    const existingService = servicesBySession.get(sessionId);
    if (existingService) {
        return existingService;
    }

    const service = getNextService();
    servicesBySession.set(sessionId, service);
    return service;
}

const server = Bun.serve({
    port: process.env.PORT ?? 3000,
    async fetch(req) {
        const {pathname} = new URL(req.url)

        if(req.method === 'POST' && pathname === '/chat'){
            const {messages, sessionId} = await req.json() as {messages: ChatMessage[], sessionId?: string};
            const service = getService(sessionId);

            console.log(`Using service: ${service?.name} service`);
            const stream = await service?.chat(messages);
            
            return new Response(stream,{
                headers: {
                    // The stream yields raw text chunks, not SSE data frames.
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                }
            })
        }
        return new Response("Not found", {status: 404});
    }
});

