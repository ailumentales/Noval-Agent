import { AIService, createAIService, OpenAIMessage } from '@/app/lib/ai-service';
import { NextResponse } from 'next/server';
import { outlineOperations, chapterOperations } from '@/app/lib/database';

export async function POST(request: Request) {
  try {
    const { chapterId, promptText } = await request.json();

    // 验证参数
    if (!chapterId) {
      return NextResponse.json({ error: '请提供章节ID' }, { status: 400 });
    }

    if (!promptText) {
      return NextResponse.json({ error: '请提供生成提示词' }, { status: 400 });
    }

    // 创建AI服务实例
    const aiService = createAIService();

    // 从数据库获取所有大纲
    const settingsList = await outlineOperations.getAll();

    // 从数据库获取所有章节
    const chaptersList = await chapterOperations.getAll();

    // 根据章节ID获取当前章节
    const chapter = chaptersList.find(ch => ch.id === chapterId);
    if (!chapter) {
      return NextResponse.json({ error: '未找到指定章节' }, { status: 404 });
    }

    // 构建所有大纲内容
    const allOutlinesContent = settingsList.map((outline: any) => {
      return `- 名称：${outline.name}（类型：${outline.type}）\n内容：${outline.content || '无'}`;
    }).join('\n\n');

    // 获取当前章节的前3章和后3章信息（处理边界条件）
    const getAdjacentChapters = (currentChapterNumber: number, chapters: any[]) => {
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

    const { prev3, next3 } = getAdjacentChapters(chapter.number, chaptersList);

    const prevChaptersContent = prev3.length > 0
      ? prev3.map(ch => `第${ch.number}章 ${ch.title}：${ch.content ? ch.content.substring(0, 200) + '...' : '暂无内容'}`).join('\n\n')
      : '无';

    const nextChaptersContent = next3.length > 0
      ? next3.map(ch => `第${ch.number}章 ${ch.title}：${ch.prompt || '暂无大纲'}`).join('\n\n')
      : '无';

    // 准备AI消息
    const systemMessages: OpenAIMessage[] = [
      {
        role: 'system',
        content: `你是一位专业的小说家助手，正在处理小说章节：第${chapter.number}章 ${chapter.title}。请根据用户的请求生成符合该章节风格和内容的高质量小说文本。`
      },
      {
        role: 'system',
        content: `你应当参考当前章节的大纲以及小说的所有设定进行编写，紧密贴合主题，生成一段长度在3000-5000字的小说文本。`
      },
    ];

    const userMessages: OpenAIMessage[] = [
      {
        role: 'user',
        content: `当前章节的相关信息：\n- 章节：第${chapter.number}章\n- 标题：${chapter.title}\n `
      },
      {
        role: 'user',
        content: `小说所有设定：\n${allOutlinesContent}`
      },
      {
        role: 'user',
        content: `前3章内容：\n${prevChaptersContent}`
      },
      {
        role: 'user',
        content: `后3章大纲：\n${nextChaptersContent}`
      },
      {
        role: 'user',
        content: `当前章节的大纲：${promptText}`
      }
    ];

    // 准备AI消息（包含类型信息）
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: "当前用户在页面进行编辑，你只需要返回文本内容，不需要调用工具进行保存。"
      },
      ...systemMessages,
      ...userMessages
    ];

    // 使用流式响应
    return aiService.createSSEResponse(request, messages);
  } catch (error) {
    console.error('生成章节内容失败:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '生成章节内容失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
