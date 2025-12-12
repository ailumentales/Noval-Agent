import { NextResponse } from 'next/server';
import { outlineOperations } from '@/app/lib/database';

export async function GET() {
  try {
    const outlines = await outlineOperations.getAll();
    return NextResponse.json(outlines);
  } catch (error) {
    console.error('获取大纲失败:', error);
    return NextResponse.json({ error: '获取大纲失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await outlineOperations.add(data.name, data.type, data.prompt, data.content);
    return NextResponse.json({ success: true, id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error('添加大纲失败:', error);
    return NextResponse.json({ error: '添加大纲失败' }, { status: 500 });
  }
}
