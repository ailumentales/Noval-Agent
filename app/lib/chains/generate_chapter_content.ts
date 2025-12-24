import { createAgent } from "langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { contentTools } from '@/app/lib/langchain-tools';
import { outlineOperations, chapterOperations, Chapter } from '@/app/lib/database';
import { createAgentModel, createStreamingAgentModel } from '@/app/lib/chains/base';
import fs from 'fs';
import path from 'path';

// 创建流式章节内容生成Agent
export async function createStreamingChapterContentAgent() {
    const model = createStreamingAgentModel();

    const existingOutlines = await outlineOperations.getAll();

    // 读取prompts/content.md文件内容
    const contentPrompt = fs.readFileSync(
        path.join(process.cwd(), 'prompts', 'content.md'), 
        'utf8'
    );
    
    const agent = createAgent({
        model,
        tools: contentTools(),
        systemPrompt: new SystemMessage({
            content: [
                {
                    type: "text",
                    text: `你是一位专业的小说家助手，负责生成章节内容。
你需要：
1. 根据用户提供的章节ID和提示词，生成符合要求的章节内容，章节的长度约为2000-3000字
2. 确保生成的内容与已有章节和大纲设定保持一致
3. 你只需要生成章节内容，不需要添加任何额外的解释或描述
4. 如果用户提供了旧内容，应当根据用户的反馈进行改进
5. 生成的内容应当符合章节的prompt要求
6. 不需要调用工具进行保存，只需要生成文本内容`
                },
                {
                    type: "text",
                    text: contentPrompt
                },
                {
                    type: "text",
                    text: `当前已存在的所有大纲设定如下：${existingOutlines.map((o) => `【${o.type}】${o.name}：${o.content || '暂无内容'}`).join('\n')}。`
                },
                {
                    type: "text",
                    text: `请结合以上大纲设定和已有章节内容，确保生成的内容与整体故事逻辑连贯、风格统一。`
                }
            ]
        })
    })

    return agent;
}

// 流式生成章节内容的便捷函数
export async function* streamChapterContent(chapterId: number, promptText: string, oldContent: string = '') {
    const agent = await createStreamingChapterContentAgent();
    
    // 获取当前章节信息
    const chaptersList = await chapterOperations.getAll();
    const chapter = chaptersList.find(ch => ch.id === chapterId);
    
    if (!chapter) {
        throw new Error('未找到指定章节');
    }
    
    // 获取相邻章节信息
    const getAdjacentChapters = (currentChapterNumber: number, chapters: Chapter[]) => {
        const sortedChapters = chapters.sort((a, b) => a.number - b.number);
        const currentIndex = sortedChapters.findIndex(ch => ch.number === currentChapterNumber);
        
        const prev3 = [];
        const next3 = [];
        
        // 前3章（不包含当前章节）
        for (let i = Math.max(0, currentIndex - 3); i < currentIndex; i++) {
            if (sortedChapters[i]) {
                prev3.push(sortedChapters[i]);
            }
        }
        
        // 后3章
        for (let i = currentIndex + 1; i <= currentIndex + 3 && i < sortedChapters.length; i++) {
            if (sortedChapters[i]) {
                next3.push(sortedChapters[i]);
            }
        }
        
        return { prev3, next3 };
    };
    
    const adjacentChapters = getAdjacentChapters(chapter.number, chaptersList);
    
    // 构建用户消息
    let userMessage = `请为第${chapter.number}章《${chapter.title}》生成内容。\n\n`;
    userMessage += `章节提示词：${chapter.prompt}\n\n`;
    
    if (oldContent && oldContent.trim() !== '') {
        userMessage += `旧内容（用户可能不满意这部分内容，请参考改进）：\n${oldContent}\n\n`;
    }
    
    userMessage += `用户要求：${promptText}\n\n`;
    
    if (adjacentChapters.prev3.length > 0) {
        userMessage += `前序章节参考：\n${adjacentChapters.prev3.map(ch => `第${ch.number}章《${ch.title}》：${ch.prompt || '暂无提示'}`).join('\n')}\n\n`;
    }
    
    if (adjacentChapters.next3.length > 0) {
        userMessage += `后续章节参考：\n${adjacentChapters.next3.map(ch => `第${ch.number}章《${ch.title}》：${ch.prompt || '暂无提示'}`).join('\n')}\n\n`;
    }
    
    userMessage += `请根据以上信息生成章节内容。`;

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