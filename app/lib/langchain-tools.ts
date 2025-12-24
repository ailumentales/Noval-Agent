// LangChain.js工具定义
import { StructuredTool, tool } from '@langchain/core/tools';
import { z } from 'zod';
import { chapterOperations, outlineOperations } from './database';


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
export class GetChapterByNumberTool extends StructuredTool {
  name = 'get_chapter_by_number';
  description = '根据章节编号（number字段）获取指定章节的内容';
  
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

// 定义根据ID获取章节工具
export class GetChapterByIdTool extends StructuredTool {
  name = 'get_chapter_by_id';
  description = '根据章节ID（id字段）获取指定章节的内容';
  
  schema = z.object({
    id: z.number().describe('要获取的章节ID'),
  });

  async _call(input: { 
    id: number
  }): Promise<string> {
    if (input.id < 1) {
      throw new Error('章节ID不能小于1');
    }

    console.log(`[GetChapterByIdTool] 获取章节，ID: ${input.id}`);
    const chapter = await chapterOperations.getById(input.id);
    
    if (!chapter) {
      throw new Error(`未找到ID为 ${input.id} 的章节`);
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
    
    console.log(`[GetChapterByIdTool] 成功获取章节，ID: ${chapter.id}, 标题: ${chapter.title}`);
    return JSON.stringify(chapterInfo, null, 2);
  }
}

// 定义按范围获取章节工具
export class GetChaptersByNumberRangeTool extends StructuredTool {
  name = 'get_chapters_by_number_range';
  description = '根据章节编号(number字段）范围获取多个章节的标题、提示词和前200字正文，同时返回章节总数和编号范围信息';
  
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
    
    // 获取所有章节以计算总数和编号范围
    console.log(`[GetChaptersByRangeTool] 获取章节范围: ${input.startNumber}-${input.endNumber}`);
    const allChapters = await chapterOperations.getAll();
    const totalChapters = allChapters.length;
    const minChapterNumber = allChapters.length > 0 ? Math.min(...allChapters.map(ch => ch.number)) : 0;
    const maxChapterNumber = allChapters.length > 0 ? Math.max(...allChapters.map(ch => ch.number)) : 0;
    
    // 获取指定范围的章节
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
    
    // 构建包含总数和范围信息的响应
    const response = {
      summary: {
        totalChapters,
        chapterNumberRange: {
          min: minChapterNumber,
          max: maxChapterNumber
        },
        requestedRange: {
          start: input.startNumber,
          end: input.endNumber,
          count: chapters.length
        }
      },
      chapters: formattedChapters
    };
    
    return JSON.stringify(response, null, 2);
  }
}

// 定义按ID范围获取章节工具
export class GetChaptersByIdRangeTool extends StructuredTool {
  name = 'get_chapters_by_id_range';
  description = '根据章节ID（id字段）范围获取多个章节的标题、提示词和前200字正文，同时返回章节总数和ID范围信息';
  
  schema = z.object({
    startId: z.number().describe('起始章节ID（从1开始）'),
    endId: z.number().describe('结束章节ID（包含）'),
  });

  async _call(input: { 
    startId: number,
    endId: number
  }): Promise<string> {
    // 验证输入参数
    if (input.startId < 1 || input.endId < input.startId) {
      throw new Error('无效的章节ID范围，请确保起始ID大于等于1且结束ID大于等于起始ID');
    }
    
    // 获取所有章节以计算总数和ID范围
    console.log(`[GetChaptersByIdRangeTool] 获取章节ID范围: ${input.startId}-${input.endId}`);
    const allChapters = await chapterOperations.getAll();
    const totalChapters = allChapters.length;
    const minChapterId = allChapters.length > 0 ? Math.min(...allChapters.map(ch => ch.id)) : 0;
    const maxChapterId = allChapters.length > 0 ? Math.max(...allChapters.map(ch => ch.id)) : 0;
    
    // 筛选指定ID范围的章节
    const chapters = allChapters.filter(chapter => 
      chapter.id >= input.startId && chapter.id <= input.endId
    ).sort((a, b) => a.id - b.id);
    
    if (!chapters || chapters.length === 0) {
      throw new Error(`未找到ID在 ${input.startId}-${input.endId} 范围内的章节`);
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
    
    // 构建包含总数和范围信息的响应
    const response = {
      summary: {
        totalChapters,
        chapterIdRange: {
          min: minChapterId,
          max: maxChapterId
        },
        requestedRange: {
          start: input.startId,
          end: input.endId,
          count: chapters.length
        }
      },
      chapters: formattedChapters
    };
    
    return JSON.stringify(response, null, 2);
  }
}

// 定义获取全部大纲工具
export class GetAllOutlinesTool extends StructuredTool {
  name = 'get_all_outlines';
  description = '获取全部大纲的详细信息，包括类型、名称和内容';
  
  schema = z.object({});

  async _call(): Promise<string> {
    try {
      // 获取所有大纲
      const outlines = await outlineOperations.getAll();
      
      // 格式化大纲信息
      const formattedOutlines = outlines.map(outline => ({
        id: outline.id,
        type: outline.type,
        name: outline.name,
        content: outline.content || '',
        created_at: outline.created_at,
        updated_at: outline.updated_at
      }));
      
      // 构建响应
      const response = {
        summary: {
          totalOutlines: outlines.length
        },
        outlines: formattedOutlines
      };
      
      return JSON.stringify(response, null, 2);
    } catch (error) {
      return JSON.stringify({ 
        error: error instanceof Error ? error.message : '获取大纲失败' 
      }, null, 2);
    }
  }
}

const responseObject = z.object({
  response: z.string().describe("Response to user."),
});

export const responseTool = tool(() => {}, {
  name: "response",
  description: "Respond to the user.",
  schema: responseObject,
})

// 创建并导出所有工具实例
export const createTools = (): StructuredTool[] => {
  return [
    new CreateChapterTool(),
    new UpdateChapterTool(),
    new DeleteChapterTool(),
    new GetChapterByNumberTool(),
    new GetChapterByIdTool(),
    new GetChaptersByNumberRangeTool(),
    new GetChaptersByIdRangeTool(),
    new GetAllOutlinesTool()
  ];
};

// 大纲工具
export const outlineTools = (): StructuredTool[] => {
  return [
    new GetAllOutlinesTool()
  ];
};

// 内容工具
export const contentTools = (): StructuredTool[] => {
  return [
    // new GetChapterByNumberTool(),
    new GetChapterByIdTool(),
    // new GetChaptersByNumberRangeTool(),
    new GetChaptersByIdRangeTool(),
    new GetAllOutlinesTool()
  ];
};

// 导出单个工具实例
export const createChapterTool = new CreateChapterTool();
export const updateChapterTool = new UpdateChapterTool();
export const deleteChapterTool = new DeleteChapterTool();
export const getChapterTool = new GetChapterByNumberTool();
export const getChapterByIdTool = new GetChapterByIdTool();
export const getChaptersByRangeTool = new GetChaptersByNumberRangeTool();
export const getChaptersByIdRangeTool = new GetChaptersByIdRangeTool();
export const getAllOutlinesTool = new GetAllOutlinesTool();