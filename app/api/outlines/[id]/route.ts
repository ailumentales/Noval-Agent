import { NextResponse } from 'next/server';
import { outlineOperations } from '@/app/lib/database';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    const outline = await outlineOperations.getById(idNum);
    if (outline) {
      return NextResponse.json(outline);
    } else {
      return NextResponse.json({ error: '大纲不存在' }, { status: 404 });
    }
  } catch (error) {
    console.error('获取大纲失败:', error);
    return NextResponse.json({ error: '获取大纲失败' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    const data = await request.json();
    console.log('收到更新大纲请求:', { id: idNum, data });
    const result = await outlineOperations.update(idNum, data);
    console.log('大纲更新结果:', result);
    return NextResponse.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error('更新大纲失败:', error);
    return NextResponse.json({ error: '更新大纲失败' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    const result = await outlineOperations.delete(idNum);
    return NextResponse.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error('删除大纲失败:', error);
    return NextResponse.json({ error: '删除大纲失败' }, { status: 500 });
  }
}
