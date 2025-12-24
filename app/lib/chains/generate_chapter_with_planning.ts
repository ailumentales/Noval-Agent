import { createAgent } from "langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createTools } from '@/app/lib/langchain-tools';
import { createAgentModel } from '@/app/lib/chains/base';
import { Annotation } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { END, START, StateGraph } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { Chapter, chapterOperations, outlineOperations } from '@/app/lib/database';


const PlanExecuteState = Annotation.Root({
    input: Annotation<string>({
        reducer: (x, y) => y ?? x ?? "",
    }),
    context: Annotation<string[]>({
        reducer: (x, y) => y ?? x ?? [],
    }),
    counter: Annotation<number>({
        reducer: (x, y) => y ?? x ?? 0,
    }),
    response: Annotation<string>({
        reducer: (x, y) => y ?? x,
    }),
    chapters: Annotation<Chapter[]>({
        reducer: (x, y) => y ?? x ?? [],
    }),
    finished: Annotation<boolean>({
        reducer: (x, y) => y ?? x ?? false,
    }),
})

/*
包含以下的步骤节点：
1. 初步生成大纲章节，包括标题和核心内容点
2. 依次更新本次生成章节的prompt字段，需要结合上下文，丰富章节的细节内容
3. 根据states，更新完成所有章节内容之后结束流程
*/

// 生成这部分章节的大纲
const plannerPrompt = ChatPromptTemplate.fromTemplate(
    `
你需要：
1. 按照用户要求的数量生成 {objective} 个新的章节

你需要遵守以下约束：
2. 确保章节标题和描述内容丰富且有逻辑性，章节标题不需要包含章节序号
6. 不同章节之间的内容和主题应当具备连贯性。如果是跨章节的关联，应当在prompt中说明和之前的哪些章节有情节关联
7. 生成完成所有章节之后，不需要继续咨询用户的行为，可以直接结束本次对话
8. 你设计的章节列表应该能够完整的描述出整个小说大纲的故事内容，让整个结构能够完整的呈现出来，包括整个故事的开头和结尾在内的全部内容。

`,
);

export async function generateChapterListWithPlanning(autoGenerateCount: number, outlineId?: number, prompt?: string) {
    const model = createAgentModel();

    const agentExecutor = createAgent({
        model,
        tools: createTools(),
    });

    // 步骤1: 初步生成大纲章节，包括标题和核心内容点
    async function generateInitialChapters(
        state: typeof PlanExecuteState.State,
        config?: RunnableConfig,
    ): Promise<Partial<typeof PlanExecuteState.State>> {
        console.log('生成初始章节大纲');
        const { counter } = state;
        // 获取最后的3个章节
        let latestChapters = (await chapterOperations.getAll())
                    .sort((a, b) => b.number - a.number)
                    .slice(0, 3);
                    
        // 确保章节按序号排序
        latestChapters = latestChapters.sort((a, b) => a.number - b.number);


        const inputMsg =  [
                new SystemMessage(`你是一位专业的小说家助手，请根据用户需求生成章节大纲。       
你需要：
1. 你需要基于已有的章节和大纲内容分, 按照用户要求的数量生成新的章节，用户要求的新增章节数量是绝对正确的，其它数字都与这个数量无关。

你需要遵守以下约束：
2. 确保章节标题和描述内容丰富且有逻辑性，章节标题不需要包含章节序号
3. 不同章节之间的内容和主题应当具备连贯性。如果是跨章节的关联，应当在prompt中说明和之前的哪些章节有情节关联
4. 生成完成所有章节之后，不需要继续咨询用户的行为，可以直接结束本次对话
5. 你设计的章节列表应该能够完整的描述出整个小说大纲的故事内容，让整个结构能够完整的呈现出来，包括整个故事的开头和结尾在内的全部内容。
6. 即使是跨越剧幕的章节，也需要具备高度的连贯性

请为每个章节提供：
- 章节标题
- 核心内容点（3-5个要点）
- 与其他章节的关联（如有）

你需要调用工具来保存生成的章节。
                `),
                new SystemMessage(`你需要按照以下JSON格式输出生成的章节ID列表，除了JSON之外不需要输出其他内容：[1,2,3]`),
                new HumanMessage(`用户需求：根据用户要求生成 ${autoGenerateCount} 个新的章节`)
            ]
        ;
            
        // 如果提供了大纲ID，添加到提示中
        if (outlineId) {
            const outline = await outlineOperations.getById(outlineId);
            if (outline) {
                inputMsg.push(new HumanMessage(`请特别参考以下大纲设定：\n【${outline.type}】${outline.name}：${outline.content || '暂无内容'}`));
            }
        }
        // 如果提供了自定义提示，添加到提示中
        if (prompt) {
            inputMsg.push(new HumanMessage(`生成的剧情范围：${prompt}`));
        }
        const input = {messages: inputMsg};
        
        const { messages } = await agentExecutor.invoke(input, config);

        let chapters: Chapter[] = []

        try {
            const lastMessage = messages[messages.length - 1].content.toString();
            console.log('最终消息', lastMessage);
            
            // 移除think部分内容，使用更健壮的正则表达式
            // 支持多行匹配，包括换行符和各种可能的think标签格式
            const cleanedMessage = lastMessage.replace(/<think>[\s\S]*?<\/think>/gi, '');
            console.log('移除think部分后的内容', cleanedMessage);
            
            // 尝试解析JSON
            const ids = JSON.parse(cleanedMessage.trim());
            
            if (ids && Array.isArray(ids)) {
                for (const id of ids) {
                    const chapter = await chapterOperations.getById(id);
                    if (chapter) {
                        chapters.push(chapter);
                    }
                }
                console.log(`根据ID查询到 ${chapters.length} 个章节`);
            }
        } catch (error) {
            console.error('根据ID查询章节失败:', error);
            chapters = [];
        }
        if (chapters.length === 0) {
            console.log("message:", messages[messages.length - 1].content.toString());
             // 如果解析失败，从数据库查询最新的counter个章节
            try {
                const allChapters = await chapterOperations.getAll();
                chapters = allChapters
                    .sort((a, b) => b.number - a.number)
                    .slice(0, counter);
               
                console.log(`从数据库获取了最新的 ${chapters.length} 个章节`);
            } catch (error) {
                console.error('从数据库查询章节失败:', error);
                chapters = [];
            }
        } 
        chapters = chapters.sort((a, b) => a.number - b.number);
        console.log(`生成 ${chapters.length} 个章节, 章节id: ${chapters.map(chapter => chapter.id)}`);
        return {
            chapters: [...latestChapters, ...chapters],
            counter: latestChapters.length,
            context: [...state.context, messages[messages.length - 1].content.toString()],
        };
    }

    // 步骤2: 依次更新本次生成章节的prompt字段，需要结合上下文，丰富章节的细节内容
    async function enrichChapterContent(
        state: typeof PlanExecuteState.State,
        config?: RunnableConfig,
    ): Promise<Partial<typeof PlanExecuteState.State>> {
        const { chapters, counter } = state;
        console.log(`总计章节数量：${chapters.length}, 当前章节序号: ${counter}, 正在生成中`);

        if (counter >= chapters.length) {
            return {
                finished: true,
            };
        }

        const currentChapter = chapters[counter];
        const input = {
            messages: [
                new SystemMessage(`你是一位专业的小说家助手，请根据已有的大纲信息，丰富章节的详细内容。
请为当前章节生成更加详细的prompt, 注意不要损失已有大纲的信息，同时你需要丰富并包含以下内容：

- 本章节的核心内容：(细化原本的基本章节描述内容)
① 本章定位（如“推进主线+爽点爆发”）；
② 出场人物 (通常不超过5个）；
③ 核心冲突/目标（如“冲突：赵凯诬陷林辰叛门并抢夺秘境收获；目标：林辰自证清白并打脸赵凯”）；
结尾附“下章预告思路”（1-2句话，如“下章可围绕‘神秘声音的主人身份’展开，引出宗门更深层的阴谋”）

然后调用工具根据ID更新章节的prompt字段。之后结束你的工作，不需要询问用户。
                `),
                new SystemMessage(`如果已经操作成功，就不要多次重复的调用工具更新章节的prompt字段！`),
                new HumanMessage(`前三章内容：${chapters.slice(0, counter).map(chapter => `第${chapter.number}章《${chapter.title}》：${chapter.prompt || '暂无提示'}, 正文: ${chapter.content || '暂无内容'}`).join('')}`),
                new HumanMessage(`后续章节概要：${chapters.slice(counter + 1).map(chapter => `第${chapter.number}章《${chapter.title}》：${chapter.prompt || '暂无提示'}`).join('、')}`),
                new HumanMessage(`当前章节信息：
                    - 标题: ${currentChapter.title}
                    - 章节ID: ${currentChapter.id}
                    - 大纲草稿: ${currentChapter.prompt ? currentChapter.prompt : '无'}
                    `)
            ]
        };
        
        const { messages } = await agentExecutor.invoke(input, config);
        const enrichedPrompt = messages[messages.length - 1].content.toString();
        
        // 更新章节的prompt字段
        const updatedChapters = [...chapters];
        updatedChapters[counter] = {
            ...currentChapter,
            prompt: enrichedPrompt,
        };
        // console.log(`更新章节 ${currentChapter.id} 的prompt字段为: ${enrichedPrompt}`);
        return {
            chapters: updatedChapters,
            counter: counter + 1,
            context: [...state.context],
            finished: counter >= chapters.length,
        };
    }

    // 步骤3: 根据states，更新完成所有章节内容之后结束流程
    async function finalizeChapters(
        state: typeof PlanExecuteState.State,
        config?: RunnableConfig,
    ): Promise<Partial<typeof PlanExecuteState.State>> {
        console.log('完成所有章节内容的生成');
        return {
            response: `成功生成 ${state.chapters.length} 个章节的详细内容`,
        };
    }

    // 判断是否继续处理下一章节
    function shouldContinueEnriching(state: typeof PlanExecuteState.State): string {
        const { chapters, counter, finished } = state;
 
        if (finished || !chapters || counter >= chapters.length ) {
            return "finalize";
        }
        
        return "enrich";
    }

    // 构建StateGraph
    const workflow = new StateGraph(PlanExecuteState)
        .addNode("generate_initial", generateInitialChapters)
        .addNode("enrich", enrichChapterContent)
        .addNode("finalize", finalizeChapters)
        .addEdge(START, "generate_initial")
        .addEdge("generate_initial", "enrich")
        .addConditionalEdges("enrich", shouldContinueEnriching, {
            enrich: "enrich",
            finalize: "finalize",
        })
        .addEdge("finalize", END);
    
    // 编译workflow
    const app = workflow.compile();
    console.log('workflow compiled');

    const config = { recursionLimit: 50 };
    const inputs = {
        input: `${autoGenerateCount}`,
        counter: autoGenerateCount,
        context: [],
    };

    return await app.invoke(inputs, config).then((res) => res);
}