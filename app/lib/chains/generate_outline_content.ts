import { createAgent } from "langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { outlineTools } from '@/app/lib/langchain-tools';
import { outlineOperations } from '@/app/lib/database';
import { createAgentModel, createStreamingAgentModel } from '@/app/lib/chains/base';

// 创建流式大纲内容生成Agent
export async function createStreamingOutlineContentAgent() {
    const model = createStreamingAgentModel();

    const existingOutlines = await outlineOperations.getAll();
    
    const agent = createAgent({
        model: model,
        tools: outlineTools(),
        systemPrompt: new SystemMessage({
            content: [
                {
                    type: "text",
                    text: `你是一位专业的小说家助手，负责生成和丰富大纲内容。
你需要：
1. 根据用户提供的大纲ID和提示词，生成或改进大纲内容
2. 确保生成的内容与其他大纲设定保持一致
3. 内容应当丰富、有逻辑性，能够为小说创作提供清晰的指导
4. 如果用户提供了旧内容，应当根据用户的反馈进行改进
5. 生成的内容应当符合大纲的类型和名称要求
6. 不需要调用工具进行保存，只需要生成文本内容`
                },
                {
                    type: "text",
                    text: `当前已存在的所有大纲设定如下：${existingOutlines.map((o) => `【${o.type}】${o.name}：${o.content || '暂无内容'}`).join('\n')}。`
                },
                {
                    type: "text",
                    text: `请结合以上大纲设定，确保生成的内容与整体故事逻辑连贯、风格统一。`
                }
            ]
        })
    })

    return agent;
}

// 流式生成大纲内容的便捷函数
export async function* streamOutlineContent(outlineId: number, promptText: string, oldContent: string = '') {
    const agent = await createStreamingOutlineContentAgent();
    
    // 获取当前大纲信息
    const outlinesList = await outlineOperations.getAll();
    const outline = outlinesList.find(o => o.id === outlineId);
    
    if (!outline) {
        throw new Error('未找到指定大纲');
    }
    
    // 构建用户消息
    let userMessage = `请为大纲《${outline.name}》（类型：${outline.type}）生成内容。\n\n`;
    
    if (oldContent) {
        userMessage += `旧内容（用户可能不满意这部分内容，请参考改进）：\n${oldContent}\n\n`;
    }
    
    userMessage += `用户要求：${promptText}\n\n`;
    
    // 获取其他相关大纲信息
    const otherOutlines = outlinesList.filter(o => o.id !== outlineId);
    if (otherOutlines.length > 0) {
        userMessage += `其他相关大纲参考：\n${otherOutlines.map(o => `【${o.type}】${o.name}：${o.content || '暂无内容'}`).join('\n')}\n\n`;
    }
    
    userMessage += `请根据以上信息生成大纲内容。`;

    const result = await agent.stream({
        messages: [new HumanMessage(userMessage)]
    }, { streamMode: "messages" });

    for await (const chunk of result) {
        const [step, content] = Object.entries(chunk)[0];
        // console.log(`step: ${step}`);
        // console.log(`content: ${JSON.stringify(content, null, 2)}`);
        yield content;
    }
}