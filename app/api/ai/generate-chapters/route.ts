import { createAIServiceV2 } from '@/app/lib/ai-service-v2';
import { OpenAIMessage } from '@/app/lib/ai-service-v2';
import { NextResponse } from 'next/server';
import { outlineOperations, chapterOperations, Outline, Chapter } from '@/app/lib/database';

export async function POST(request: Request) {
  try {
    const { autoGenerateCount } = await request.json();

    // 验证参数
    if (!autoGenerateCount || autoGenerateCount < 1) {
      return NextResponse.json({ error: '请输入有效的章节数量' }, { status: 400 });
    }

    // 创建AI服务实例
    const aiService = createAIServiceV2();

    // 从数据库获取所有大纲
    const existingOutlines = await outlineOperations.getAll();

    // 获取最新的5个章节
    const allChapters = await chapterOperations.getAll();
    const latestChapters = allChapters
      .sort((a, b) => b.number - a.number) // 按章节编号降序排列
      .slice(0, 5); // 获取最新的5个章节

    // 准备AI消息，要求生成章节并直接使用create_chapter工具创建
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: `你是一位专业的小说家助手，请根据用户需求生成小说章节列表并使用create_chapter工具创建章节。
        
        你需要：
        1. 按照用户要求的数量生成新的章节，每个章节包含标题和prompt字段
        2. 确保章节标题和描述内容丰富且有逻辑性，章节标题不需要包含章节序号
        3. 如果章节数量过多，你应当分批输出，每次最多不超过10个章节
        4. Prompt应当是一个给AI使用的提示词，你需要结合需求来设计一个良好的提示词。
        5. Prompt字段需要描述当前章节的内容和主题，内容应当包括关联任人物，发生地点，主要行为，包括3-5个核心情节点
        6. 不同章节之间的内容和主题应当具备连贯性。如果是跨章节的关联，应当在prompt中说明和之前的哪些章节由情节关联
        7. 生成完成所有章节之后，不需要继续咨询用户的行为，可以直接结束本次对话
        8. 你设计的章节列表应该能够完整的描述出整个小说大纲的故事内容，让整个结构能够完整的呈现出来，包括整个故事的开头和结尾在内的全部内容。
        
        create_chapter工具说明：
        - name: "create_chapter"
        - 用于在数据库中创建章节
        - 参数格式：{ "items": [{ "title": "章节标题", "prompt": "章节描述" }, ...] }`
      },
      {
        role: 'system',
        content: `你在调用工具时如果失败，需要尝试使用更短的请求（比如一次生成更少的章节，多次生成）来完成这个工作。`
      },
      {
        role: 'system',
        content: `你需要检测当前已经生成过的章节数量，不要生成重复的章节。需要恰好生成用户需要的小说章节数量。`
      },
      {
        role: 'user',
        content: `当前已存在的所有大纲设定如下：${existingOutlines.map((o: Outline) => `【${o.type}】${o.name}：${o.content || '暂无内容'}`).join('\n')}。
        ${latestChapters.length > 0 ? `当前已存在的最新5个章节如下：\n${latestChapters.map((chapter: Chapter) => `第${chapter.number}章 ${chapter.title}：${chapter.prompt || '暂无提示'}`).join('\n')}\n请结合以上大纲设定和已有章节内容，确保生成的新章节与现有章节逻辑连贯、风格统一。` : '当前暂无已创建的章节，请直接根据大纲生成新章节。'}`
      },
      {
        role: 'user',
        content: `你需要基于已有的章节，在之后新增生成 ${autoGenerateCount} 个小说章节`
      },
    ];

    // 使用AI客户端生成章节（一次性响应）
    const aiResponse = await aiService.sendMessage(messages);

    // 提取思考内容
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    const thinkMatches = aiResponse.match(thinkRegex);
    let thinkText = '';

    if (thinkMatches) {
      const lastThinkMatch = thinkMatches[thinkMatches.length - 1];
      thinkText = lastThinkMatch.replace(/<\/?think>/g, '');
    }

    // 返回完整响应
    return NextResponse.json({
      content: aiResponse,
      thinkText
    });
  } catch (error) {
    console.error('生成章节列表失败:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '生成章节列表失败，请检查控制台获取更多信息'
    }, { status: 500 });
  }
}
