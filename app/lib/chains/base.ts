import { ChatOpenAI, OpenAI } from '@langchain/openai';


export function createAgentModel() {
    return new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        modelName: process.env.OPENAI_MODEL || 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 32768,
        timeout: 60000,
    });
}

export function createStreamingAgentModel() {
    return new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        modelName: process.env.OPENAI_MODEL || 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 32768,
        streaming: true,
    });
}
