import { NextResponse } from 'next/server';
import { chapterOperations } from '@/app/lib/database';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    const chapter = await chapterOperations.getById(idNum);
    if (chapter) {
      return NextResponse.json(chapter);
    } else {
      return NextResponse.json({ error: '章节不存在' }, { status: 404 });
    }
  } catch (error) {
    console.error('获取章节失败:', error);
    return NextResponse.json({ error: '获取章节失败' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    const data = await request.json();
    const result = await chapterOperations.update(idNum, data);
    return NextResponse.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error('更新章节失败:', error);
    return NextResponse.json({ error: '更新章节失败' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    const result = await chapterOperations.delete(idNum);
    return NextResponse.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error('删除章节失败:', error);
    return NextResponse.json({ error: '删除章节失败' }, { status: 500 });
  }
}
