import { streamOutlineContent } from '@/app/lib/chains/generate_outline_content';

export async function POST(request: Request) {
  try {
    const { outlineId, promptText, oldContent } = await request.json();

    // 验证参数
    if (!outlineId) {
      return new Response(JSON.stringify({ error: '请提供大纲ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!promptText) {
      return new Response(JSON.stringify({ error: '请提供生成提示词' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 使用流式Agent生成大纲内容
          const contentStream = streamOutlineContent(outlineId, promptText, oldContent);
          
          for await (const chunk of contentStream) {
            // console.log('Received chunk:', chunk.content);
            // 直接处理chunk.content
            if (chunk && chunk.content) {
              // 处理不同类型的内容
              let content = '';
              if (typeof chunk.content === 'string') {
                content = chunk.content;
              } else if (Array.isArray(chunk.content)) {
                // 如果是数组格式，提取文本内容
                content = chunk.content
                  .filter(item => item.type === 'text')
                  .map(item => item.text)
                  .join('');
              }
              
              if (content) {
                // 发送内容块
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }
          }
          
          // 发送结束标记
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error('流式生成大纲内容失败:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : '生成大纲内容失败' })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('生成大纲内容失败:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : '生成大纲内容失败，请检查控制台获取更多信息'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}