import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { createMCPService } from './mcp-service';

// 定义简洁的OpenAI消息类型，用于客户端使用
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call?: any;
  tool_call_id?: string;
}

// 定义工具调用请求类型
export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
}

// 将自定义消息类型转换为OpenAI客户端库所需的类型
function convertToChatCompletionParam(messages: OpenAIMessage[]): ChatCompletionMessageParam[] {
  return messages.map(msg => {
    const baseMsg: any = {
      role: msg.role,
      content: msg.content
    };

    if (msg.tool_call) {
      baseMsg.tool_call = msg.tool_call;
    }

    if (msg.tool_call_id) {
      baseMsg.tool_call_id = msg.tool_call_id;
    }

    return baseMsg as ChatCompletionMessageParam;
  });
}

// MCP工具调用服务实例
const mcpService = createMCPService();

// 调用工具函数
async function callTool(toolCall: ToolCall): Promise<string> {
  try {
    // 使用MCP服务的通用工具调用方法
    const result = await mcpService.callTool(toolCall.name, toolCall.parameters);
    return `工具调用输出: ${JSON.stringify(result)}`;
  } catch (error) {
    console.error('工具调用失败:', error);
    throw error;
  }
}

// 定义AI服务配置接口
export interface AIServiceConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  // 工具调用配置
  enableTools?: boolean;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: any;
    };
  }>;
}

// AI服务类，使用OpenAI官方客户端库
export class AIService {
  private client: OpenAI;
  private defaultConfig: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    // 从MCP服务获取所有已注册的工具定义
    const mcpTools = mcpService.getToolsMetadata();
    
    // 将MCP工具转换为OpenAI客户端需要的格式
    const openAITools = mcpTools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));

    this.defaultConfig = {
      model: process.env.OPENAI_MODEL || 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 4096000,
      enableTools: true,
      tools: openAITools,
      ...config
    };

    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      baseURL: config.baseURL || process.env.OPENAI_BASE_URL,
    });
  }

  /**
   * 一次性读取AI响应（非流式）
   * @param messages 对话消息列表
   * @param options 可选配置
   * @returns Promise<string> AI响应内容
   */
  async sendMessage(messages: OpenAIMessage[], options?: Partial<AIServiceConfig>): Promise<string> {
    const config = { ...this.defaultConfig, ...options };

    try {
      const chatCompletion = await this.client.chat.completions.create({
        model: config.model!,
        messages: convertToChatCompletionParam(messages),
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: false,
        tools: config.enableTools ? config.tools : undefined,
        tool_choice: config.enableTools ? 'auto' : undefined,
      });

      const message = chatCompletion.choices[0]?.message;
      messages.push({
        role: message?.role || 'assistant',
        content: message?.content || ''
      });

      // 处理工具调用
      if (message?.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            // 解析工具调用参数
            const functionCall = toolCall.function;
            const toolName = functionCall.name;
            const argumentsString = functionCall.arguments || '{}';
            
            // console.log(`[MCP] 原始参数内容: ${argumentsString}`);
            // 清理参数字符串
            const cleanArguments = argumentsString
              .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
              .trim();
            console.log(`[MCP] 清理后的参数内容: ${cleanArguments}`);
            let doinvoke = true;
            // 严格解析JSON
            let toolParams;
            try {
              toolParams = JSON.parse(cleanArguments);
            } catch (parseError) {
              doinvoke = false;
              console.error('[MCP] JSON解析失败:', parseError);
              // 返回错误信息给AI，使用思考内容格式
              const errorResponse = `JSON解析失败：${JSON.stringify(parseError)}。\n\n请提供完整、有效的JSON格式参数，确保：\n1. 所有引号都是双引号\n2. 所有字符串和属性名都用引号包裹\n3. 没有缺失的逗号\n4. 对象和数组都正确闭合\n5. 没有无效的控制字符\n\n请重新生成符合要求的JSON参数。`;
              messages.push({
                role: 'assistant',
                content: errorResponse,
                tool_call: toolCall
              });
              continue;
            }

            if (doinvoke) {
              console.log(`[MCP] 调用工具: ${toolName}`);
              console.log(`[MCP] 当前的思考链路: ${JSON.stringify(messages)}`);
              // 调用相应的工具
              const toolResult = await callTool({
                name: toolName,
                parameters: toolParams
              });

              // 将工具调用结果添加到消息列表中
              const toolMessage: OpenAIMessage = {
                role: 'tool',
                content: toolResult,
                tool_call_id: toolCall.id
              };
               // 继续与AI对话，传递工具调用结果
              messages.push(
                {
                  role: 'assistant',
                  content: '',
                  tool_call: {
                    id: toolCall.id,
                    type: 'function',
                    function: functionCall
                  }
                },
                toolMessage
              );

            }

           
            // 递归调用sendMessage，获取AI对工具结果的响应
            return this.sendMessage(messages, options);
          }
        }
      }
      console.log(`[MCP] 最终消息内容: ${message?.content || ''}`);

      return message?.content || '';
    } catch (error) {
      console.error('AI一次性请求失败:', error);
      throw error;
    }
  }

  // sendMessageStream方法已被移除，前端应通过API路由使用createSSEResponse

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
    options?: Partial<AIServiceConfig>
  ): Promise<Response> {
    const config = { ...this.defaultConfig, ...options };
    // 保存client实例到闭包中，避免递归调用时上下文丢失
    const client = this.client;

    try {
      // 初始的流式响应
      const stream = await client.chat.completions.create({
        model: config.model!,
        messages: convertToChatCompletionParam(messages),
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
        tools: config.enableTools ? config.tools : undefined,
        tool_choice: config.enableTools ? 'auto' : undefined,
      });

      return new Response(
        new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            let accumulatedContent = '';
            let currentToolCall: any = null;
            let toolCallBuffer = '';

            try {
              for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;

                if (delta?.tool_calls) {
                  // 处理工具调用
                  for (const toolCallDelta of delta.tool_calls) {
                    if (toolCallDelta.type === 'function') {
                      if (!currentToolCall) {
                        currentToolCall = {
                          id: toolCallDelta.id,
                          type: toolCallDelta.type,
                          function: {
                            name: toolCallDelta.function?.name || '',
                            arguments: ''
                          }
                        };
                      }

                      if (toolCallDelta.function?.name) {
                        currentToolCall.function.name = toolCallDelta.function.name;
                      }

                      if (toolCallDelta.function?.arguments) {
                        currentToolCall.function.arguments += toolCallDelta.function.arguments;
                      }
                    }
                  }
                } else if (delta?.content) {
                  // 处理普通内容
                  accumulatedContent = delta.content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: accumulatedContent })}\n\n`));
                }

                // 检查是否完成了工具调用
                if (currentToolCall && chunk.choices[0]?.finish_reason) {
                   let doinvoke = true;
                  try {
                    // 解析工具调用参数
                    const toolName = currentToolCall.function.name;
                    let argumentsString = currentToolCall.function.arguments;
                    // console.log(`[MCP] 工具调用参数原始内容: ${argumentsString}`);
                    
                    // 清理参数字符串，去除控制字符
                    const cleanArguments = argumentsString
                      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
                      .trim();
                    console.log(`[MCP] 清理后的参数内容: ${cleanArguments}`);
                    // 严格解析JSON
                    let toolParams;
                    try {
                      toolParams = JSON.parse(cleanArguments);
                    } catch (parseError) {
                      console.error('[MCP] JSON解析失败:', parseError);
                      doinvoke = false;
                      
                      // 返回明确的错误信息给AI，使用思考内容格式
                      const errorResponse = `JSON解析失败：${JSON.stringify(parseError)}。\n\n请提供完整、有效的JSON格式参数，确保：\n1. 所有引号都是双引号\n2. 所有字符串和属性名都用引号包裹\n3. 没有缺失的逗号\n4. 对象和数组都正确闭合\n5. 没有无效的控制字符\n\n请重新生成符合要求的JSON参数。`;
                      messages.push({
                        role: 'assistant',
                        content: '',
                        tool_call: currentToolCall
                      },
                     {
                        role: 'tool',
                        content: errorResponse,
                        tool_call_id: currentToolCall.id
                      });
                      continue;
                    }
                    console.log(`[MCP] 解析后的参数内容: ${JSON.stringify(toolParams)}`);
                    
                    if (doinvoke) {
                      // 调用相应的工具
                      // 调用相应的工具
                      const toolResult = await callTool({
                        name: toolName,
                        parameters: toolParams
                      });

                      // 将工具调用结果发送给客户端
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ toolCallResult: toolResult })}\n\n`));

                      // 更新消息列表，包含工具调用结果
                      messages.push(
                        {
                          role: 'assistant',
                          content: '',
                          tool_call: currentToolCall
                        },
                        {
                          role: 'tool',
                          content: toolResult,
                          tool_call_id: currentToolCall.id
                        }
                      );
                    }
                   
                    // 递归调用，获取AI对工具结果的响应
                    const followupStream = await client.chat.completions.create({
                      model: config.model!,
                      messages: convertToChatCompletionParam(messages),
                      temperature: config.temperature,
                      max_tokens: config.maxTokens,
                      stream: true,
                    });

                    // 处理后续的响应流
                    accumulatedContent = '';
                    for await (const followupChunk of followupStream) {
                      const followupDelta = followupChunk.choices[0]?.delta;
                      if (followupDelta?.content) {
                        accumulatedContent = followupDelta.content;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: accumulatedContent })}\n\n`));
                      }
                    }
                  } catch (error) {
                    console.error('工具调用处理失败:', error);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '工具调用处理失败' })}\n\n`));
                  } finally {
                    currentToolCall = null;
                  }
                }
              }
              
              // 发送结束信号
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch (error) {
              console.error('SSE流处理失败:', error);
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
      console.error('创建SSE响应失败:', error);
      
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
 * @returns AIService AI服务实例
 */
export function createAIService(config?: Partial<AIServiceConfig>): AIService {
  return new AIService(config || {});
}

/**
 * 创建一个模拟的AI服务实例（用于开发和测试）
 * @returns AIService 模拟的AI服务实例
 */
export function createMockAIService(): AIService {
  return new AIService({
    apiKey: 'mock-api-key',
    baseURL: 'http://localhost:3000/mock-ai',
  });
}
