import { createAgent } from "langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createTools } from '@/app/lib/langchain-tools';
import { outlineOperations, chapterOperations } from '@/app/lib/database';
import { createAgentModel } from '@/app/lib/chains/base';


// 创建章节生成Agent
export async function createChapterListAgent() {
    const model = createAgentModel();

    const existingOutlines = await outlineOperations.getAll();
    const allChapters = await chapterOperations.getAll();
    const latestChapters = allChapters
        .sort((a, b) => b.number - a.number)
        .slice(0, 5);
    const agent = createAgent({
        model,
        tools: createTools(),
        systemPrompt: new SystemMessage({
            content: [
                {
                    type: "text",
                    text: `你是一位专业的小说家助手，请根据用户需求生成小说章节列表并使用create_chapter工具创建章节。
你需要：
1. 按照用户要求的数量生成新的章节，每个章节包含标题和prompt字段
2. 确保章节标题和描述内容丰富且有逻辑性，章节标题不需要包含章节序号
3. 如果章节数量过多，你应当分批输出，每次最多不超过10个章节
4. Prompt应当是一个给AI使用的提示词，你需要结合需求来设计一个良好的提示词。
5. Prompt字段需要描述当前章节的内容和主题，内容应当包括关联人物，发生地点，主要行为，包括3-5个核心情节点
6. 不同章节之间的内容和主题应当具备连贯性。如果是跨章节的关联，应当在prompt中说明和之前的哪些章节有情节关联
7. 生成完成所有章节之后，不需要继续咨询用户的行为，可以直接结束本次对话
8. 你设计的章节列表应该能够完整的描述出整个小说大纲的故事内容，让整个结构能够完整的呈现出来，包括整个故事的开头和结尾在内的全部内容。
`
                },
                {
                    type: "text",
                    text: `当前已存在的所有大纲设定如下：${existingOutlines.map((o) => `【${o.type}】${o.name}：${o.content || '暂无内容'}`).join('\n')}。
                        ${latestChapters.length > 0 ? `当前已存在的最新5个章节如下：\n${latestChapters.map((chapter) => `第${chapter.number}章 ${chapter.title}：${chapter.prompt || '暂无提示'}`).join('\n')}\n请结合以上大纲设定和已有章节内容，确保生成的新章节与现有章节逻辑连贯、风格统一。` : '当前暂无已创建的章节，请直接根据大纲生成新章节。'}`
                },
                {
                    type: "text",
                    text: `你在调用工具时如果失败，需要尝试使用更短的请求（比如一次生成更少的章节，多次生成）来完成这个工作。
                    你需要检测当前已经生成过的章节数量，不要生成重复的章节。需要恰好生成用户需要的小说章节数量。`
                }
            ]
        }),
    })

    return agent;
}

// 生成章节列表的便捷函数
export async function generateChapterList(autoGenerateCount: number, outlineId?: number, prompt?: string) {
    const agent = await createChapterListAgent();

    const messages = [new HumanMessage(`你需要基于已有的章节，在之后新增生成 ${autoGenerateCount} 个小说章节`)];
    
    // 如果提供了大纲ID，添加到提示中
    if (outlineId) {
        const outline = await outlineOperations.getById(outlineId);
        if (outline) {
            messages.push(new HumanMessage(`请特别参考以下大纲设定：\n【${outline.type}】${outline.name}：${outline.content || '暂无内容'}`));
        }
    }
    
    // 如果提供了自定义提示，添加到提示中
    if (prompt) {
        messages.push(new HumanMessage(`用户额外要求：${prompt}`));
    }

    const result = await agent.invoke({
        messages
    });

    return result;
}