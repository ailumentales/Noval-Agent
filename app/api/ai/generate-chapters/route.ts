import { NextResponse } from 'next/server';
import { generateChapterList } from '@/app/lib/chains/generate_chapter';
import { generateChapterListWithPlanning } from '@/app/lib/chains/generate_chapter_with_planning';

export async function POST(request: Request) {
  try {
    const { autoGenerateCount, outlineId, prompt } = await request.json();

    // 验证参数
    if (!autoGenerateCount || autoGenerateCount < 1) {
      return NextResponse.json({ error: '请输入有效的章节数量' }, { status: 400 });
    }
    console.log('entry generate-chapters autoGenerateCount', autoGenerateCount, 'outlineId', outlineId, 'prompt', prompt);

    // 使用Agent生成章节
    const agentResult = await generateChapterListWithPlanning(autoGenerateCount, outlineId, prompt);
    console.log(JSON.stringify(agentResult));

    // 提取AI响应内容
    const messages = agentResult.response;
    // const messages = agentResult.messages
    const lastMessage = messages[messages.length - 1];
    let content = '';
    let thinkText = '';

    // 返回完整响应
    return NextResponse.json({
      content,
      thinkText,
    });
  } catch (error) {
    console.error('生成章节列表失败:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '生成章节列表失败，请检查控制台获取更多信息'
    }, { status: 500 });
  }
}
