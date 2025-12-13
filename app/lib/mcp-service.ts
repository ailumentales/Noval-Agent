// MCP服务实现 - 简化版本，专注于工具调用功能
import { chapterOperations } from './database';

// 定义数字乘法工具的输入参数接口
export interface MultiplyParams {
  a: number;
  b: number;
}

// 定义创建章节工具的输入参数接口
export interface CreateChapterParams {
  title: string;
  prompt: string;
  content?: string;
}

// 定义更新章节工具的输入参数接口
export interface UpdateChapterParams {
  id: number;
  title?: string;
  prompt?: string;
  number?: number;
  content?: string;
}

// 定义删除章节工具的输入参数接口
export interface DeleteChapterParams {
  id: number;
}

// 定义批量操作参数接口
export interface BatchOperationParams<T> {
  items: T[];
}

// 定义工具元数据接口
export interface ToolMetadata {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
    oneOf?: Array<{
      required: string[];
    }>;
  };
}

// 定义数字乘法工具的元数据
export const multiplyToolMetadata: ToolMetadata = {
  name: 'multiply',
  description: '计算两个数字的乘积或多个乘法运算',
  parameters: {
    type: 'object',
    properties: {
      // 单个乘法参数
      a: {
        type: 'number',
        description: '第一个数字'
      },
      b: {
        type: 'number',
        description: '第二个数字'
      },
      // 批量乘法参数
      items: {
        type: 'array',
        description: '要计算的乘法运算数组（用于批量操作）',
        items: {
          type: 'object',
          properties: {
            a: {
              type: 'number',
              description: '第一个数字'
            },
            b: {
              type: 'number',
              description: '第二个数字'
            }
          },
          required: ['a', 'b']
        }
      }
    },
    oneOf: [
      { required: ['a', 'b'] },
      { required: ['items'] }
    ]
  }
};

// 定义创建章节工具的元数据
export const createChapterToolMetadata: ToolMetadata = {
  name: 'create_chapter',
  description: '在数据库中创建一个或多个新章节',
  parameters: {
    type: 'object',
    properties: {
      // 单个创建参数
      title: {
        type: 'string',
        description: '章节标题'
      },
      prompt: {
        type: 'string',
        description: '章节的生成提示词'
      },
      content: {
        type: 'string',
        description: '章节内容（可选）'
      },
      // 批量创建参数
      items: {
        type: 'array',
        description: '要创建的章节数组（用于批量操作）',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: '章节标题'
            },
            prompt: {
              type: 'string',
              description: '章节的生成提示词'
            },
            content: {
              type: 'string',
              description: '章节内容（可选）'
            }
          },
          required: ['title', 'prompt']
        }
      }
    },
    oneOf: [
      { required: ['title', 'prompt'] },
      { required: ['items'] }
    ]
  }
};

// 定义更新章节工具的元数据
export const updateChapterToolMetadata: ToolMetadata = {
  name: 'update_chapter',
  description: '更新数据库中的一个或多个章节',
  parameters: {
    type: 'object',
    properties: {
      // 单个更新参数
      id: {
        type: 'number',
        description: '章节ID'
      },
      title: {
        type: 'string',
        description: '章节标题（可选）'
      },
      prompt: {
        type: 'string',
        description: '章节的生成提示词（可选）'
      },
      number: {
        type: 'number',
        description: '章节编号（可选）'
      },
      content: {
        type: 'string',
        description: '章节内容（可选）'
      },
      // 批量更新参数
      items: {
        type: 'array',
        description: '要更新的章节数组（用于批量操作）',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: '章节ID'
            },
            title: {
              type: 'string',
              description: '章节标题（可选）'
            },
            prompt: {
              type: 'string',
              description: '章节的生成提示词（可选）'
            },
            number: {
              type: 'number',
              description: '章节编号（可选）'
            },
            content: {
              type: 'string',
              description: '章节内容（可选）'
            }
          },
          required: ['id']
        }
      }
    },
    oneOf: [
      { required: ['id'] },
      { required: ['items'] }
    ]
  }
};

// 定义删除章节工具的元数据
export const deleteChapterToolMetadata: ToolMetadata = {
  name: 'delete_chapter',
  description: '从数据库中删除一个或多个章节',
  parameters: {
    type: 'object',
    properties: {
      // 单个删除参数
      id: {
        type: 'number',
        description: '章节ID'
      },
      // 批量删除参数
      items: {
        type: 'array',
        description: '要删除的章节ID数组（用于批量操作）',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: '章节ID'
            }
          },
          required: ['id']
        }
      }
    },
    oneOf: [
      { required: ['id'] },
      { required: ['items'] }
    ]
  }
};

// 实现数字乘法工具函数
async function multiply(params: MultiplyParams | BatchOperationParams<MultiplyParams>): Promise<number | number[]> {
  // 批量操作
  if ('items' in params) {
    console.log(`[MCP] 批量调用multiply工具，共${params.items.length}项`);
    const results = await Promise.all(
      params.items.map(item => multiply(item))
    );
    // 扁平化结果数组，确保返回number[]
    return results.flat();
  }
  // 单个操作
  return params.a * params.b;
}

// 实现创建章节工具函数
async function createChapter(params: CreateChapterParams | BatchOperationParams<CreateChapterParams>): Promise<string> {
  // 批量操作
  if ('items' in params) {
    console.log(`[MCP] 批量调用createChapter工具，共${params.items.length}项`);
    const results = await Promise.all(
      params.items.map(item => createChapter(item))
    );
    return `创建章节成功，创建的章节索引: ${results.join(', ')}`;
  }
  // 单个操作
  const result = await chapterOperations.add(params.title, params.prompt);
  return `创建章节成功，创建的章节索引: ${result.lastInsertRowid}`;
}

// 实现更新章节工具函数
async function updateChapter(params: UpdateChapterParams | BatchOperationParams<UpdateChapterParams>): Promise<{ success: boolean, updatedId?: number } | { success: boolean, updatedIds?: number[] }> {
  // 批量操作
  if ('items' in params) {
    console.log(`[MCP] 批量调用updateChapter工具，共${params.items.length}项`);
    const updateResults = await Promise.all(
      params.items.map(item => updateChapter(item))
    );
    const updatedIds = updateResults
      .filter(result => result.success)
      .map(result => (result as { updatedId: number }).updatedId)
      .filter((id): id is number => id !== undefined);
    return { success: updatedIds.length > 0, updatedIds };
  }
  // 单个操作
  try {
    const result = await chapterOperations.update(params.id, {
      title: params.title,
      prompt: params.prompt,
      number: params.number,
      content: params.content
    });
    return { success: result.changes > 0, updatedId: params.id };
  } catch (error) {
    console.error(`[MCP] 更新章节失败 (ID: ${params.id}):`, error);
    return { success: false };
  }
}

// 实现删除章节工具函数
async function deleteChapter(params: DeleteChapterParams | BatchOperationParams<DeleteChapterParams>): Promise<{ success: boolean, deletedId?: number } | { success: boolean, deletedIds?: number[] }> {
  // 批量操作
  if ('items' in params) {
    console.log(`[MCP] 批量调用deleteChapter工具，共${params.items.length}项`);
    const deleteResults = await Promise.all(
      params.items.map(item => deleteChapter(item))
    );
    const deletedIds = deleteResults
      .filter(result => result.success)
      .map(result => (result as { deletedId: number }).deletedId)
      .filter((id): id is number => id !== undefined);
    return { success: deletedIds.length > 0, deletedIds };
  }
  // 单个操作
  try {
    const result = await chapterOperations.delete(params.id);
    return { success: result.changes > 0, deletedId: params.id };
  } catch (error) {
    console.error(`[MCP] 删除章节失败 (ID: ${params.id}):`, error);
    return { success: false };
  }
}

// MCP服务类，用于管理工具调用
class MCPService {
  private tools: Map<string, (params: any) => Promise<any>> = new Map();
  private toolMetadata: Map<string, ToolMetadata> = new Map();

  constructor() {
    // 注册内置工具
    this.registerTool(multiplyToolMetadata, multiply);
    this.registerTool(createChapterToolMetadata, createChapter);
    this.registerTool(updateChapterToolMetadata, updateChapter);
    this.registerTool(deleteChapterToolMetadata, deleteChapter);
  }

  /**
   * 注册工具
   * @param metadata 工具元数据
   * @param handler 工具处理函数
   */
  registerTool(metadata: ToolMetadata, handler: (params: any) => Promise<any>): void {
    this.tools.set(metadata.name, handler);
    this.toolMetadata.set(metadata.name, metadata);
  }

  /**
   * 获取所有已注册工具的元数据
   * @returns ToolMetadata[] 工具元数据列表
   */
  getToolsMetadata(): ToolMetadata[] {
    return Array.from(this.toolMetadata.values());
  }

  /**
   * 调用工具
   * @param toolName 工具名称
   * @param params 工具参数
   * @returns Promise<any> 工具调用结果
   */
  async callTool(toolName: string, params: any): Promise<any> {
    console.log(`[MCP] 接收到工具调用请求: ${toolName}`);
    console.log(`[MCP] 工具参数:`, JSON.stringify(params));
    
    const handler = this.tools.get(toolName);
    if (!handler) {
      throw new Error(`未知的工具: ${toolName}`);
    }
    
    const result = await handler(params);
    console.log(`[MCP] 工具调用结果: ${result}`);
    
    return result;
  }

  /**
   * 直接调用数字乘法工具（用于测试和直接调用）
   * @param a 第一个数字
   * @param b 第二个数字
   * @returns Promise<number> 乘积结果
   */
  async callMultiply(a: number, b: number): Promise<number> {
    return multiply({ a, b }) as Promise<number>;
  }
}

/**
 * 创建MCP服务实例的工具函数
 * @returns MCPService MCP服务实例
 */
export function createMCPService(): MCPService {
  return new MCPService();
}

/**
 * 创建一个模拟的MCP服务实例（用于开发和测试）
 * @returns MCPService 模拟的MCP服务实例
 */
export function createMockMCPService(): MCPService {
  return new MCPService();
}
