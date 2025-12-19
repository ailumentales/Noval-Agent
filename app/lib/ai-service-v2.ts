
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage, ToolCall } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { createTools } from './langchain-tools';

// 定义简洁的OpenAI消息类型，用于客户端使用
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call?: ToolCall;
  tool_call_id?: string;
}

// LangChain工具实例
const langchainTools = createTools();

// 定义AI服务配置接口
export interface AIServiceV2Config {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  // 工具调用配置
  enableTools?: boolean;
  tools?: StructuredTool[];
}

// AI服务类，使用LangChain.js实现
export class AIServiceV2 {
  private chatModel: ChatOpenAI;
  private defaultConfig: AIServiceV2Config;
  private tools: StructuredTool[];

  constructor(config: AIServiceV2Config) {
    // 直接使用LangChain工具
    this.tools = langchainTools;
    
    this.defaultConfig = {
      model: process.env.OPENAI_MODEL || 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 32768,
      enableTools: true, 
      tools: this.tools,
      ...config
    };

    // 初始化LangChain ChatOpenAI模型
    this.chatModel = new ChatOpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      modelName: this.defaultConfig.model!,
      temperature: this.defaultConfig.temperature,
      maxTokens: this.defaultConfig.maxTokens,
    });
  }

  // 将OpenAIMessage转换为LangChain BaseMessage
  private convertToBaseMessage(messages: OpenAIMessage[]): BaseMessage[] {
    return messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          if (msg.tool_call) {
            // 确保tool_call格式符合LangChain要求，包含id字段
            const toolCallId = String((msg.tool_call).id || `toolcall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
            const toolCall = {
              id: toolCallId,
              name: String(msg.tool_call.name || ''),
              args: msg.tool_call.args || {},
              type: 'tool_call' as const
            };
            return new AIMessage({
              content: '',
              tool_calls: [toolCall]
            });
          }
          return new AIMessage(msg.content);
        case 'tool':
          return new ToolMessage({
            content: msg.content,
            tool_call_id: msg.tool_call_id || ''
          });
        default:
          throw new Error(`未知的消息角色: ${msg.role}`);
      }
    });
  }

  /**
   * 一次性读取AI响应（非流式）
   * @param messages 对话消息列表
   * @param options 可选配置
   * @returns Promise<string> AI响应内容
   */
  async sendMessage(messages: OpenAIMessage[], options?: Partial<AIServiceV2Config>): Promise<string> {
    const config = { ...this.defaultConfig, ...options };
    const baseMessages = this.convertToBaseMessage(messages);

    try {
      // 配置模型是否使用工具
      const modelWithTools = config.enableTools 
        ? this.chatModel.bindTools(config.tools!) 
        : this.chatModel;

      const response = await modelWithTools.invoke(baseMessages);
      
      // 处理工具调用
      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log('工具调用的思考过程:', response.content);
        for (const toolCall of response.tool_calls) {
          // 确保工具调用对象有id字段
          const toolCallWithId = {
            ...toolCall,
            id: toolCall.id || `toolcall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          if (toolCallWithId.type === 'tool_call' && toolCallWithId.name) {
            try {
              console.log('收到工具调用:', JSON.stringify(toolCallWithId));
              const toolName = toolCallWithId.name;
              const toolParams = toolCallWithId.args || {};
              
              // 查找对应的LangChain工具
              const tool = this.tools.find(t => t.name === toolName);
              if (!tool) {
                throw new Error(`未找到工具: ${toolName}`);
              }
              
              // 直接调用LangChain工具
              const toolResult = await tool.invoke(toolParams);
              
              // 更新消息列表，包含工具调用和结果
              messages.push(
                {
                  role: 'assistant',
                  content: '',
                  tool_call: toolCallWithId
                },
                {
                  role: 'tool',
                  content: toolResult,
                  tool_call_id: toolCallWithId.id
                }
              );
              
              // 递归调用，获取AI对工具结果的响应
              return this.sendMessage(messages, options);
            } catch (error) {
              console.error('工具调用处理失败:', error);
              throw error;
            }
          }
        }
      }
      
      // 处理content可能是数组的情况
      const content = response.content;
      if (Array.isArray(content)) {
        return content.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join('');
      }
      return String(content || '');
    } catch (error) {
      console.error('AI一次性请求失败:', error);
      throw error;
    }
  }

  /**
   * 创建适合Next.js API路由的SSE响应
   * @param request Request对象
   * @param messages 对话消息列表
   * @param options 可选配置
   * @returns Response SSE响应对象
   */
  async createSSEResponse(
    request: Request,
    messages: OpenAIMessage[],
    options?: Partial<AIServiceV2Config>
  ): Promise<Response> {
    const config = { ...this.defaultConfig, ...options };
    const baseMessages = this.convertToBaseMessage(messages);

    try {
      // 配置模型是否使用工具
      const modelWithTools = config.enableTools 
        ? this.chatModel.bindTools(config.tools!) 
        : this.chatModel;

      // 创建SSE响应
      const tools = this.tools;
      const convertToBaseMessage = this.convertToBaseMessage.bind(this);
      
      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              const encoder = new TextEncoder();
              
              // 处理模型输出流
              const stream = await modelWithTools.stream(baseMessages);
              
              for await (const chunk of stream) {
                if (chunk.content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk.content })}\n\n`));
                }

                // 处理工具调用
                if (chunk.tool_calls && chunk.tool_calls.length > 0) {
                  for (const toolCall of chunk.tool_calls) {
                    if (toolCall.type === 'tool_call' && toolCall.name) {
                      try {
                        const toolName = toolCall.name;
                        const toolParams = toolCall.args || {};
                        
                        // 查找对应的LangChain工具
                        const tool = tools.find(t => t.name === toolName);
                        if (!tool) {
                          throw new Error(`未找到工具: ${toolName}`);
                        }
                        
                        // 直接调用LangChain工具
                        const toolResult = await tool.invoke(toolParams);
                        
                        // 将工具调用结果发送给客户端
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ toolCallResult: toolResult })}\n\n`));
                        
                        // 更新消息列表，包含工具调用和结果
                        messages.push(
                          {
                            role: 'assistant',
                            content: '',
                            tool_call: toolCall
                          },
                          {
                            role: 'tool',
                            content: toolResult,
                            tool_call_id: toolCall.id
                          }
                        );
                        
                        // 递归调用，获取AI对工具结果的响应
                        const followupBaseMessages = convertToBaseMessage(messages);
                        const followupStream = await modelWithTools.stream(followupBaseMessages);
                        
                        // 处理后续的响应流
                        for await (const followupChunk of followupStream) {
                          if (followupChunk.content) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: followupChunk.content })}\n\n`));
                          }
                        }
                      } catch (error) {
                        console.error('工具调用处理失败:', error as Error);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '工具调用处理失败' })}\n\n`));
                      }
                    }
                  }
                }
              }
              
              // 发送结束信号
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch (error) {
              console.error('SSE流处理失败:', error as Error);
              controller.error(error);
            }
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    } catch (error) {
      console.error('创建SSE响应失败:', error as Error);
      
      return new Response(JSON.stringify({ error: 'AI请求失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}

/**
 * 创建AI服务实例的工具函数
 * @param config 可选的配置参数
 * @returns AIServiceV2 AI服务实例
 */
export function createAIServiceV2(config?: Partial<AIServiceV2Config>): AIServiceV2 {
  return new AIServiceV2(config || {});
}
