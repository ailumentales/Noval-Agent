import { NextResponse } from 'next/server';
import { chapterOperations } from '@/app/lib/database';

export async function GET() {
  try {
    const chapters = await chapterOperations.getAll();
    return NextResponse.json(chapters);
  } catch (error) {
    console.error('获取章节失败:', error);
    return NextResponse.json({ error: '获取章节失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await chapterOperations.add(data.title, data.prompt, data.content);
    return NextResponse.json({ success: true, id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error('添加章节失败:', error);
    return NextResponse.json({ error: '添加章节失败' }, { status: 500 });
  }
}
