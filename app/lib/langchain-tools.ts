// LangChain.js工具定义
import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { chapterOperations } from './database';


// 定义创建章节工具
export class CreateChapterTool extends StructuredTool {
  name = 'create_chapter';
  description = '在数据库中创建一个或多个新章节';
  
  schema = z.object({
    items: z.array(z.object({
      title: z.string().describe('章节标题'),
      prompt: z.string().describe('章节的生成提示词'),
      content: z.string().optional().describe('章节内容（可选）')
    })).describe('要创建的章节数组，支持单个或多个章节')
  });

  async _call(input: { 
    items: Array<{ title: string, prompt: string, content?: string }> 
  }): Promise<string> {
    if (!input.items || input.items.length === 0) {
      throw new Error('请提供至少一个要创建的章节');
    }

    console.log(`[CreateChapterTool] 创建章节，共${input.items.length}项`);
    const results = await Promise.all(
      input.items.map(item => chapterOperations.add(item.title, item.prompt, item.content))
    );
    
    if (input.items.length === 1) {
      return `创建章节成功，创建的章节索引: ${results[0].lastInsertRowid}`;
    } else {
      return `批量创建章节成功，创建的章节索引: ${results.map(r => r.lastInsertRowid).join(', ')}`;
    }
  }
}

// 定义更新章节工具
export class UpdateChapterTool extends StructuredTool {
  name = 'update_chapter';
  description = '更新数据库中的一个或多个章节';
  
  schema = z.object({
    items: z.array(z.object({
      id: z.number().describe('章节ID'),
      title: z.string().optional().describe('章节标题（可选）'),
      prompt: z.string().optional().describe('章节的生成提示词（可选）'),
      number: z.number().optional().describe('章节编号（可选）'),
      content: z.string().optional().describe('章节内容（可选）')
    })).describe('要更新的章节数组，支持单个或多个章节')
  });

  async _call(input: { 
    items: Array<{ 
      id: number, 
      title?: string, 
      prompt?: string, 
      number?: number, 
      content?: string 
    }>
  }): Promise<string> {
    if (!input.items || input.items.length === 0) {
      throw new Error('请提供至少一个要更新的章节');
    }

    console.log(`[UpdateChapterTool] 更新章节，共${input.items.length}项`);
    const results = await Promise.all(
      input.items.map(item => chapterOperations.update(item.id, {
        title: item.title,
        prompt: item.prompt,
        number: item.number,
        content: item.content
      }))
    );
    
    const successCount = results.filter(r => r.changes > 0).length;
    
    if (input.items.length === 1) {
      if (successCount > 0) {
        return `更新章节成功，更新了 ${successCount} 条记录`;
      } else {
        throw new Error(`更新章节失败，未找到ID为 ${input.items[0].id} 的章节`);
      }
    } else {
      return `批量更新章节完成，成功更新 ${successCount} 个章节`;
    }
  }
}

// 定义删除章节工具
export class DeleteChapterTool extends StructuredTool {
  name = 'delete_chapter';
  description = '从数据库中删除一个或多个章节';
  
  schema = z.object({
    items: z.array(z.object({
      id: z.number().describe('章节ID')
    })).describe('要删除的章节ID数组，支持单个或多个章节')
  });

  async _call(input: { 
    items: Array<{ id: number }> 
  }): Promise<string> {
    if (!input.items || input.items.length === 0) {
      throw new Error('请提供至少一个要删除的章节');
    }

    console.log(`[DeleteChapterTool] 删除章节，共${input.items.length}项`);
    const results = await Promise.all(
      input.items.map(item => chapterOperations.delete(item.id))
    );
    
    const successCount = results.filter(r => r.changes > 0).length;
    
    if (input.items.length === 1) {
      if (successCount > 0) {
        return `删除章节成功，删除了 ${successCount} 条记录`;
      } else {
        throw new Error(`删除章节失败，未找到ID为 ${input.items[0].id} 的章节`);
      }
    } else {
      return `批量删除章节完成，成功删除 ${successCount} 个章节`;
    }
  }
}

// 定义获取章节工具
export class GetChapterTool extends StructuredTool {
  name = 'get_chapter';
  description = '根据章节编号获取指定章节的内容';
  
  schema = z.object({
    number: z.number().describe('要获取的章节编号（从1开始）'),
  });

  async _call(input: { 
    number: number
  }): Promise<string> {
    if (input.number < 1) {
      throw new Error('章节编号不能小于1');
    }

    console.log(`[GetChapterTool] 获取章节，编号: ${input.number}`);
    const chapter = await chapterOperations.getByNumber(input.number);
    
    if (!chapter) {
      throw new Error(`未找到编号为 ${input.number} 的章节`);
    }
    
    // 格式化章节内容
    const chapterInfo = {
      id: chapter.id,
      title: chapter.title,
      number: chapter.number,
      prompt: chapter.prompt,
      content: chapter.content || '',
      word_count: chapter.word_count,
      created_at: chapter.created_at,
      updated_at: chapter.updated_at
    };
    
    console.log(`[GetChapterTool] 成功获取章节，ID: ${chapter.id}, 标题: ${chapter.title}`);
    return JSON.stringify(chapterInfo, null, 2);
  }
}

// 定义按范围获取章节工具
export class GetChaptersByRangeTool extends StructuredTool {
  name = 'get_chapters_by_range';
  description = '根据章节编号范围获取多个章节的标题、提示词和前200字正文';
  
  schema = z.object({
    startNumber: z.number().describe('起始章节编号（从1开始）'),
    endNumber: z.number().describe('结束章节编号（包含）'),
  });

  async _call(input: { 
    startNumber: number,
    endNumber: number
  }): Promise<string> {
    // 验证输入参数
    if (input.startNumber < 1 || input.endNumber < input.startNumber) {
      throw new Error('无效的章节范围，请确保起始编号大于等于1且结束编号大于等于起始编号');
    }
    
    // 获取章节范围
    console.log(`[GetChaptersByRangeTool] 获取章节范围: ${input.startNumber}-${input.endNumber}`);
    const chapters = await chapterOperations.getByRange(input.startNumber, input.endNumber);
    
    if (!chapters || chapters.length === 0) {
      throw new Error(`未找到编号在 ${input.startNumber}-${input.endNumber} 范围内的章节`);
    }
    
    // 格式化章节信息，只包含标题、提示词和前200字正文
    const formattedChapters = chapters.map(chapter => ({
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      prompt: chapter.prompt,
      contentPreview: chapter.content ? chapter.content.substring(0, 200) + (chapter.content.length > 200 ? '...' : '') : '',
      word_count: chapter.word_count
    }));
    
    return JSON.stringify(formattedChapters, null, 2);
  }
}



// 创建并导出所有工具实例
export const createTools = (): StructuredTool[] => {
  return [
    new CreateChapterTool(),
    new UpdateChapterTool(),
    new DeleteChapterTool(),
    new GetChapterTool(),
    new GetChaptersByRangeTool()
  ];
};

// 导出单个工具实例
export const createChapterTool = new CreateChapterTool();
export const updateChapterTool = new UpdateChapterTool();
export const deleteChapterTool = new DeleteChapterTool();
export const getChapterTool = new GetChapterTool();
export const getChaptersByRangeTool = new GetChaptersByRangeTool();