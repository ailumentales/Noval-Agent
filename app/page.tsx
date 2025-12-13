'use client';
import { Layout, TextArea, List, Button, Card, Tabs, Modal, Form, Select } from '@douyinfe/semi-ui';
import { IconPlusCircle, IconEdit, IconDelete } from '@douyinfe/semi-icons';
import { useEffect, useState } from 'react';
import { useAIClient } from './lib/ai-client';
import { OpenAIMessage } from './lib/ai-service';

const { Header, Sider, Content } = Layout;

export default function Home() {
  // 状态管理
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [showOutlineModal, setShowOutlineModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showEditOutlineModal, setShowEditOutlineModal] = useState(false);
  const [showEditChapterModal, setShowEditChapterModal] = useState(false);
  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
  const [currentOutline, setCurrentOutline] = useState<any>(null);
  const [currentChapter, setCurrentChapter] = useState<any>(null);
  // 选中项目状态
  const [selectedOutline, setSelectedOutline] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  // 输入输出内容状态
  const [promptText, setPromptText] = useState('');
  const [contentText, setContentText] = useState('');
  const [thinkText, setThinkText] = useState('');
  // 自动生成章节状态
  const [autoGenerateCount, setAutoGenerateCount] = useState<number>(1);
  const [generatingChapters, setGeneratingChapters] = useState<boolean>(false);
  
  // AI客户端
  const aiClient = useAIClient();
  const [generating, setGenerating] = useState(false);
  
  // 从数据库获取数据
  useEffect(() => {
    fetchOutlines();
    fetchChapters();
  }, []);
  
  // 获取大纲列表
  const fetchOutlines = async () => {
    try {
      const response = await fetch('/api/outlines');
      if (!response.ok) {
        throw new Error('获取大纲失败');
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('大纲数据格式不正确');
      }
      setSettingsList(data);
    } catch (error) {
      console.error('获取大纲失败:', error);
      alert(error instanceof Error ? error.message : '获取大纲失败，请检查控制台获取更多信息');
    }
  };
  
  // 获取章节列表
  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/chapters');
      if (!response.ok) {
        throw new Error('获取章节失败');
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('章节数据格式不正确');
      }
      // 格式化字数显示
      const formattedChapters = data.map((chapter: any) => ({
        ...chapter,
        wordCount: chapter.word_count ? chapter.word_count.toLocaleString() : '0'
      }));
      setChaptersList(formattedChapters);
    } catch (error) {
      console.error('获取章节失败:', error);
      alert(error instanceof Error ? error.message : '获取章节失败，请检查控制台获取更多信息');
    }
  };
  
  // 新增设定
  const handleAddOutline = async (values: any) => {
    try {
      const response = await fetch('/api/outlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '新增设定失败');
      }
      
      setShowOutlineModal(false);
      fetchOutlines();
    } catch (error) {
      console.error('新增设定失败:', error);
      alert(error instanceof Error ? error.message : '新增设定失败，请检查控制台获取更多信息');
    }
  };
  
  // 新增章节
  const handleAddChapter = async (values: any) => {
    try {
      const response = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '新增章节失败');
      }
      
      setShowChapterModal(false);
      fetchChapters();
    } catch (error) {
      console.error('新增章节失败:', error);
      alert(error instanceof Error ? error.message : '新增章节失败，请检查控制台获取更多信息');
    }
  };
  
  // 编辑设定
  const handleEditOutline = async (values: any) => {
    try {
      console.log('编辑设定提交的数据:', values);
      console.log('当前大纲ID:', currentOutline.id);
      
      const response = await fetch(`/api/outlines/${currentOutline.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      console.log('编辑设定的响应状态:', response.status);
      const responseData = await response.json();
      console.log('编辑设定的响应数据:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.error || '编辑设定失败');
      }
      
      setShowEditOutlineModal(false);
      fetchOutlines();
    } catch (error) {
      console.error('编辑设定失败:', error);
      alert(error instanceof Error ? error.message : '编辑设定失败，请检查控制台获取更多信息');
    }
  };
  
  // 编辑章节
  const handleEditChapter = async (values: any) => {
    try {
      const response = await fetch(`/api/chapters/${currentChapter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '编辑章节失败');
      }
      
      setShowEditChapterModal(false);
      fetchChapters();
    } catch (error) {
      console.error('编辑章节失败:', error);
      alert(error instanceof Error ? error.message : '编辑章节失败，请检查控制台获取更多信息');
    }
  };
  
  // 预留预处理接口
  // 这里可以根据不同类型实现不同的预处理逻辑
  const outlinePreprocessor = (outline: any) => {
     // 构建所有大纲内容
        const allOutlinesContent = settingsList.map(outline => {
          return `- 名称：${outline.name}（类型：${outline.type}）\n内容：${outline.content || '无'}`;
        }).join('\n\n');
    return {
      
      // 返回预处理后的system messages数组
      getSystemMessages: () => [
        {
          role: 'system' as const,
          content: `你是一位专业的小说家助手，正在处理大纲：${outline.name}（类型：${outline.type}）。请根据用户的请求和大纲的类型，进一步丰富小说的设定和基础背景、大纲故事等内容。`
        },
        {
          role: 'system' as const,
          content: `你需要为整个小说的创作设定大纲，注意你不需要编写详细的剧情或者正文，而是对于小说的设定、基础背景、大纲故事等内容进行完善。`
        },
        {
          role: 'system' as const,
          content: `当前大纲的相关信息：\n- 名称：${outline.name}\n- 类型：${outline.type}\n`
        }
      ],
      // 返回预处理后的user messages数组
      processUserInput: (input: string) => [
        {
          role: 'user' as const,
          content: `小说所有设定：\n${allOutlinesContent}`
        },
        {
          role: 'user' as const,
          content: input
        }
      ]
    };
  };

  const chapterPreprocessor = (chapter: any) => {
    return {
      // 返回预处理后的system messages数组
      getSystemMessages: () => [
        {
          role: 'system' as const,
          content: `你是一位专业的小说家助手，正在处理小说章节：第${chapter.number}章 ${chapter.title}。请根据用户的请求生成符合该章节风格和内容的高质量小说文本。`
        },
        {
          role: 'system' as const,
          content: `你应当参考当前章节的大纲以及小说的所有设定进行编写，紧密贴合主题，生成一段长度在3000-5000字的小说文本。`
        },
        
      ],
      // 返回预处理后的user messages数组
      processUserInput: (input: string) => {
        // 构建所有大纲内容
        const allOutlinesContent = settingsList.map(outline => {
          return `- 名称：${outline.name}（类型：${outline.type}）\n内容：${outline.content || '无'}`;
        }).join('\n\n');

        // 获取当前章节的前3章和后3章信息（处理边界条件）
        const getAdjacentChapters = (currentChapterNumber: number, chapters: any[]) => {
        const sortedChapters = chapters.sort((a, b) => a.number - b.number);
        const currentIndex = sortedChapters.findIndex(ch => ch.number === currentChapterNumber);
        
        const prev3 = [];
        const next3 = [];
        
        // 前3章（不包含当前章节）
        for (let i = Math.max(0, currentIndex - 3); i < currentIndex; i++) {
          if (sortedChapters[i]) {
            prev3.push(sortedChapters[i]);
          }
        }
        
        // 后3章
        for (let i = currentIndex + 1; i <= currentIndex + 3 && i < sortedChapters.length; i++) {
          if (sortedChapters[i]) {
            next3.push(sortedChapters[i]);
          }
        }
        
        return { prev3, next3 };
      };
      
      const { prev3, next3 } = getAdjacentChapters(chapter.number, chaptersList);
      
      const prevChaptersContent = prev3.length > 0 
        ? prev3.map(ch => `第${ch.number}章 ${ch.title}：${ch.content ? ch.content.substring(0, 200) + '...' : '暂无内容'}`).join('\n\n')
        : '无';
      
      const nextChaptersContent = next3.length > 0
        ? next3.map(ch => `第${ch.number}章 ${ch.title}：${ch.prompt || '暂无大纲'}`).join('\n\n')
        : '无';
      
      return [
        {
          role: 'user' as const,
          content: `当前章节的相关信息：\n- 章节：第${chapter.number}章\n- 标题：${chapter.title}\n `
        },
        {
          role: 'user' as const,
          content: `小说所有设定：\n${allOutlinesContent}`
        },
        {
          role: 'user' as const,
          content: `前3章内容：\n${prevChaptersContent}`
        },
        {
          role: 'user' as const,
          content: `后3章大纲：\n${nextChaptersContent}`
        },
        {
          role: 'user' as const,
          content: `当前章节的大纲：${input}`
        }
      ];
        
        return [
          {
            role: 'user' as const,
            content: `当前章节的相关信息：\n- 章节：第${chapter.number}章\n- 标题：${chapter.title}\n `
          },
          {
            role: 'user' as const,
            content: `小说所有设定：\n${allOutlinesContent}`
          },
          {
            role: 'user' as const,
            content: `当前章节的大纲：${input}`
          }
        ];
      }
    };
  };

  // 自动生成章节列表
  const handleAutoGenerateChapters = async () => {
    try {
      if (!autoGenerateCount || autoGenerateCount < 1) {
        alert('请输入有效的章节数量');
        return;
      }
      
      setGeneratingChapters(true);
      
      // 获取当前最大章节编号
      let maxChapterNumber = 0;
      if (chaptersList.length > 0) {
        maxChapterNumber = Math.max(...chaptersList.map(chapter => chapter.number));
      }
      
      // 准备AI消息，要求生成章节并直接使用create_chapter工具创建
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: `你是一位专业的小说家助手，请根据用户需求生成小说章节列表并使用create_chapter工具创建章节。
          
          你需要：
          1. 生成 ${autoGenerateCount} 个小说章节，每个章节包含标题和prompt字段
          2. 确保章节标题和描述内容丰富且有逻辑性
          3. 如果章节数量过多，你应当分批输出，每次最多不超过10个章节
          4. Prompt应当是一个给AI使用的提示词，你需要结合需求来设计一个良好的提示词。
          5. prompt字段需要描述当前章节的内容和主题，内容应当包括关联任人物，发生地点，主要行为，包括3-5个核心情节点
          6. 不同章节之间的内容和主题应当具备连贯性。如果是跨章节的关联，应当在prompt中说明和之前的哪些章节由情节关联
          7. 生成完成所有章节之后，不需要继续咨询用户的行为，可以直接结束本次对话
          8. 你设计的章节列表应该能够完整的描述出整个小说大纲的故事内容，让整个结构能够完整的呈现出来，包括整个故事的开头和结尾在内的全部内容。
          
          create_chapter工具说明：
          - name: "create_chapter"
          - 用于在数据库中创建章节
          - 参数格式：{ "items": [{ "title": "章节标题", "prompt": "章节描述" }, ...] }`
        },
        {
          role: 'system',
          content: `你在调用工具时如果失败，需要尝试使用更短的请求（比如一次生成更少的章节，多次生成）来完成这个工作。`
        },
        {
          role: 'user',
          content: `当前已存在的所有大纲设定如下：${settingsList.map(o => `【${o.type}】${o.name}：${o.content || '暂无内容'}`).join('\n')}, 请结合以上全部大纲设定，确保生成的章节内容与之逻辑自洽、风格统一。`
        },
        // {
        //   role: 'user',
        //   content: `请生成${autoGenerateCount}个小说章节的列表，并使用create_chapter工具创建到数据库中。`
        // }
      ];
      
      // 使用AI客户端生成章节
      const aiResponse = await aiClient.sendMessage(messages);
      console.log('[AutoGenerate] 完整AI响应:', aiResponse);
      
      // 提取思考内容
      const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
      const thinkMatches = aiResponse.match(thinkRegex);
      
      if (thinkMatches) {
        const lastThinkMatch = thinkMatches[thinkMatches.length - 1];
        const thinkText = lastThinkMatch.replace(/<\/?think>/g, '');
        
        // 限制显示4行
        const thinkLines = thinkText.split('\n');
        const thinkContent = thinkLines.length > 4 
          ? thinkLines.slice(0, 4).join('\n') + '...' 
          : thinkText;
        
        setThinkText(thinkContent);
      }
      
      // 刷新章节列表
      fetchChapters();
      
      // 关闭模态框
      setShowAutoGenerateModal(false);
      
      alert(`成功生成章节`);
    } catch (error) {
      console.error('自动生成章节失败:', error);
      alert(error instanceof Error ? error.message : '自动生成章节失败，请检查控制台获取更多信息');
    } finally {
      setGeneratingChapters(false);
    }
  };
  
  // 生成AI内容
  const handleGenerate = async () => {
    try {
      if (!promptText.trim()) {
        alert('请先输入AI请求内容');
        return;
      }
      
      if (!selectedOutline && !selectedChapter) {
        alert('请先选择一个大纲或章节');
        return;
      }
      
      setGenerating(true);
      
      // 根据选中类型获取预处理Hook
      let systemMessages: OpenAIMessage[] = [
        {
          role: 'system',
          content: '你是一位专业的小说家助手，根据用户的请求生成高质量的小说内容。'
        }
      ];
      let userMessages: OpenAIMessage[] = [
        {
          role: 'user',
          content: promptText
        }
      ];
      
      if (selectedOutline) {
        // 使用大纲预处理Hook
        const outlineProcessor = outlinePreprocessor(selectedOutline);
        systemMessages = outlineProcessor.getSystemMessages();
        userMessages = outlineProcessor.processUserInput(promptText);
      } else if (selectedChapter) {
        // 使用章节预处理Hook
        const chapterProcessor = chapterPreprocessor(selectedChapter);
        systemMessages = chapterProcessor.getSystemMessages();
        userMessages = chapterProcessor.processUserInput(promptText);
      }
      
      // 准备AI消息（包含类型信息）
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: "当前用户在页面进行编辑，你只需要返回文本内容，不需要调用工具进行保存。"
        },
        ...systemMessages,
        ...userMessages
      ];
      
      // 使用流式响应
      await aiClient.sendMessageStream(messages, (chunk, isComplete) => {
        if (!isComplete) {
          // console.log('[Stream] 收到内容:', chunk);
          // 分离think内容和普通内容
          let processedContent = chunk;
          let processedThink = '';
          
          // 提取think内容（假设think内容用<think></think>标签包裹）
          const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
          const matches = [...chunk.matchAll(thinkRegex)];
          
          if (matches.length > 0) {
            // 提取最后一个匹配的think内容
            processedThink = matches[matches.length - 1][1];
            
            // 从原始内容中移除所有think标签
            processedContent = chunk.replace(thinkRegex, '');
            
          }
          
          // 更新状态
          setContentText(processedContent);
          setThinkText(processedThink);
        } else {
          setGenerating(false);
        }
      });
      
    } catch (error) {
      console.error('AI生成失败:', error);
      alert('AI生成失败，请检查控制台获取更多信息');
      setGenerating(false);
    }
  };

  // 保存内容
  const handleSaveContent = async () => {
    try {
      if (!selectedOutline && !selectedChapter) {
        alert('请先选择一个大纲或章节');
        return;
      }
      
      const data = {
        prompt: promptText,
        content: contentText
      };
      
      let response;
      if (selectedOutline) {
        // 保存大纲
        response = await fetch(`/api/outlines/${selectedOutline.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        // 保存章节
        // 确保内容长度用于字数统计
        const chapterData = {
          ...data,
          word_count: contentText.length
        };
        response = await fetch(`/api/chapters/${selectedChapter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chapterData)
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存失败');
      }
      
      // 保存成功后重新获取最新数据
      fetchOutlines();
      fetchChapters();
      
      // 更新当前选中项状态
      if (selectedOutline) {
        const updatedOutline = { ...selectedOutline, ...data };
        setSelectedOutline(updatedOutline);
      } else {
        const updatedChapter = { 
          ...selectedChapter, 
          ...data, 
          word_count: contentText.length,
          wordCount: contentText.length.toLocaleString()
        };
        setSelectedChapter(updatedChapter);
      }
      
      alert('保存成功');
    } catch (error) {
      console.error('保存失败:', error);
      alert(error instanceof Error ? error.message : '保存失败，请检查控制台获取更多信息');
    }
  };
  
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Layout className="w-full h-full">
        {/* 左侧章节列表 */}
        <Sider 
          className="bg-white border-r border-gray-200" 
          style={{ width: 280 }}
        >
          <Header className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-800">Novel-Agent</h2>
            </div>
          </Header>
          <Content className="p-4">
            <Tabs defaultActiveKey="chapters" className="mb-4">
              <Tabs.TabPane tab="大纲" itemKey="outline">
                <h3 className="text-sm font-medium text-gray-700 mb-3">设定列表</h3>
                <List
                  dataSource={settingsList}
                  renderItem={(setting) => (
                    <List.Item 
                      key={setting.id}
                      className="cursor-pointer hover:bg-gray-50 rounded-md p-3 transition-colors border-l-2 border-transparent hover:border-purple-500"
                      onClick={() => {
                        // 选中大纲
                        setSelectedOutline(setting);
                        setSelectedChapter(null);
                        // 加载数据到输入输出区域
                        setPromptText(setting.prompt || '');
                        setContentText(setting.content || '');
                        // 清空思考内容
                        setThinkText('');
                      }}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className={`text-gray-800 font-medium truncate ${selectedOutline?.id === setting.id ? 'text-purple-600' : ''}`}>{setting.name}</div>
                          <div className="text-xs text-gray-500">{setting.type}</div>
                        </div>
                        <div className="flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
                          <Button 
                            icon={<IconEdit />} 
                            type="tertiary" 
                            size="small"
                            onClick={() => {
                              console.log('点击编辑按钮，当前设定:', setting);
                              setCurrentOutline(setting);
                              setShowEditOutlineModal(true);
                              console.log('编辑模态框已显示，currentOutline:', currentOutline);
                            }}
                          />
                          <Button 
                            icon={<IconDelete />} 
                            type="tertiary" 
                            size="small"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/outlines/${setting.id}`, {
                                  method: 'DELETE'
                                });
                                if (response.ok) {
                                  fetchOutlines();
                                }
                              } catch (error) {
                                console.error('删除设定失败:', error);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
                <Button 
                  icon={<IconPlusCircle />} 
                  type="tertiary" 
                  size="small"
                  className="w-full mt-3 rounded-md"
                  onClick={() => setShowOutlineModal(true)}
                >
                  新增设定
                </Button>
              </Tabs.TabPane>
              <Tabs.TabPane tab="章节" itemKey="chapters">
                <Button 
                  icon={<IconPlusCircle />} 
                  type="primary" 
                  size="small"
                  className="w-full mb-3 rounded-md"
                  onClick={() => setShowAutoGenerateModal(true)}
                >
                  自动生成章节列表
                </Button>
                <List
                  dataSource={chaptersList}
                  renderItem={(chapter) => (
                    <List.Item 
                      key={chapter.id}
                      className="cursor-pointer hover:bg-gray-50 rounded-md p-3 transition-colors border-l-2 border-transparent hover:border-blue-500"
                      onClick={() => {
                        // 选中章节
                        setSelectedChapter(chapter);
                        setSelectedOutline(null);
                        // 加载数据到输入输出区域
                        setPromptText(chapter.prompt || '');
                        setContentText(chapter.content || '');
                        // 清空思考内容
                        setThinkText('');
                      }}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className={`text-gray-800 font-medium truncate ${selectedChapter?.id === chapter.id ? 'text-blue-600' : ''}`}>第{chapter.number}章 {chapter.title}</div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">字数: {chapter.wordCount}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
                          <Button 
                            icon={<IconEdit />} 
                            type="tertiary" 
                            size="small"
                            onClick={() => {
                              setCurrentChapter(chapter);
                              setShowEditChapterModal(true);
                            }}
                          />
                          <Button 
                            icon={<IconDelete />} 
                            type="tertiary" 
                            size="small"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/chapters/${chapter.id}`, {
                                  method: 'DELETE'
                                });
                                if (response.ok) {
                                  fetchChapters();
                                }
                              } catch (error) {
                                console.error('删除章节失败:', error);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
                <Button 
                  icon={<IconPlusCircle />} 
                  type="tertiary" 
                  size="small"
                  className="w-full mt-3 rounded-md"
                  onClick={() => setShowChapterModal(true)}
                >
                  新增章节
                </Button>
              </Tabs.TabPane>
            </Tabs>
            
            {/* 自动生成章节列表模态框 */}
            <Modal
              title="自动生成章节列表"
              visible={showAutoGenerateModal}
              onCancel={() => setShowAutoGenerateModal(false)}
              footer={[
                <Button key="cancel" onClick={() => setShowAutoGenerateModal(false)}>
                  取消
                </Button>,
                <Button key="submit" type="primary" onClick={handleAutoGenerateChapters} disabled={generatingChapters}>
                  {generatingChapters ? '生成中...' : '生成章节'}
                </Button>
              ]}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">预期章节数量</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={autoGenerateCount}
                    onChange={(e) => setAutoGenerateCount(Number(e.target.value) || 1)}
                    placeholder="请输入章节数量"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </Modal>
          </Content>
        </Sider>
        
        {/* 右侧内容区域 */}
        <Layout className="flex-1 flex flex-col">
          {/* 输入请求和AI输出都放在同一个Content容器中 */}
          <Content className="flex-1 flex flex-col p-6 overflow-hidden">
            {/* 当前选中项标题 */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedOutline ? `大纲：${selectedOutline.name}` : 
                 selectedChapter ? `第${selectedChapter.number}章 ${selectedChapter.title}` : 
                 '请选择一个大纲或章节'}
              </h2>
              {selectedChapter && (
                <p className="text-sm text-gray-500 mt-1">
                  章节编号：{selectedChapter.number} | 字数：{selectedChapter.wordCount}
                </p>
              )}
            </div>
            
            {/* 顶部输入框 - 固定最小高度 */}
            <Card className="mb-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">输入请求</h3>
                <Button type="primary" size="large" onClick={handleGenerate} disabled={generating}>
                  {generating ? '生成中...' : '开始生成'}
                </Button>
              </div>
              <TextArea
                placeholder="请输入与AI的对话请求..."
                style={{ width: '100%', minHeight: '150px' }}
                value={promptText}
                onChange={(value) => setPromptText(value)}
              />
            </Card>
            
            {/* 底部输出区域 - 占满剩余高度 */}
            <Card className="flex-1 flex flex-col" bodyStyle={{ height: 'calc(100% - 50px)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">AI输出</h3>
                <Button type="primary" size="small" onClick={handleSaveContent}>保存</Button>
              </div>
              <div className="flex-1 overflow-hidden" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Think内容显示区域 */}
                {thinkText && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-md max-h-40 overflow-y-auto">
                    <div className="text-sm font-medium text-blue-800 mb-2">思考内容:</div>
                    <div className="text-sm text-blue-900 whitespace-pre-wrap">{thinkText}</div>
                  </div>
                )}
                {/* 普通内容显示区域 */}
                <div className="flex-1 overflow-hidden">
                  <TextArea
                    placeholder="AI的输出内容将显示在这里..."
                    style={{ width: '100%', height: '100%'}}
                    value={contentText}
                    onChange={(value) => setContentText(value)}
                  />
                </div>
              </div>
            </Card>
          </Content>
        </Layout>
      </Layout>
      
      {/* 新增设定弹窗 */}
      <Modal
        title="新增设定"
        visible={showOutlineModal}
        onCancel={() => setShowOutlineModal(false)}
        width={500}
        footer={null}
      >
        <Form
          onSubmit={handleAddOutline}
          layout="vertical"
        >
          <Form.Input 
            field="name" 
            label="名称" 
            placeholder="请输入设定名称" 
            rules={[{ required: true, message: '请输入设定名称' }]} 
          />
          <Form.Select 
            field="type" 
            label="类型" 
            placeholder="请选择设定类型" 
            rules={[{ required: true, message: '请选择设定类型' }]}
          >
            <Select.Option value="人物">人物</Select.Option>
            <Select.Option value="背景">背景</Select.Option>
            <Select.Option value="设定">设定</Select.Option>
            <Select.Option value="大纲">大纲</Select.Option>
            <Select.Option value="其他">其他</Select.Option>
          </Form.Select>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="tertiary" onClick={() => setShowOutlineModal(false)}>取消</Button>
            <Button type="primary" htmlType="submit">提交</Button>
          </div>
        </Form>
      </Modal>
      
      {/* 新增章节弹窗 */}
      <Modal
        title="新增章节"
        visible={showChapterModal}
        onCancel={() => setShowChapterModal(false)}
        width={500}
        footer={null}
      >
        <Form
          onSubmit={handleAddChapter}
          layout="vertical"
        >
          <Form.Input 
            field="title" 
            label="标题" 
            placeholder="请输入章节标题" 
            rules={[{ required: true, message: '请输入章节标题' }]} 
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="tertiary" onClick={() => setShowChapterModal(false)}>取消</Button>
            <Button type="primary" htmlType="submit">提交</Button>
          </div>
        </Form>
      </Modal>
      
      {/* 编辑设定弹窗 */}
      <Modal
        title="编辑设定"
        visible={showEditOutlineModal}
        onCancel={() => setShowEditOutlineModal(false)}
        width={500}
        footer={null}
      >
        {currentOutline && (
          <>
            {console.log('编辑模态框渲染，currentOutline:', currentOutline)}
            <Form
              onSubmit={handleEditOutline}
              layout="vertical"
              initValues={currentOutline}
            >
              <Form.Input 
                field="name" 
                label="名称" 
                placeholder="请输入设定名称" 
                rules={[{ required: true, message: '请输入设定名称' }]} 
              />
              <Form.Select 
                field="type" 
                label="类型" 
                placeholder="请选择设定类型" 
                rules={[{ required: true, message: '请选择设定类型' }]}
              >
                <Select.Option value="人物">人物</Select.Option>
                <Select.Option value="背景">背景</Select.Option>
                <Select.Option value="设定">设定</Select.Option>
                <Select.Option value="大纲">大纲</Select.Option>
                <Select.Option value="其他">其他</Select.Option>
              </Form.Select>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="tertiary" onClick={() => setShowEditOutlineModal(false)}>取消</Button>
                <Button type="primary" htmlType="submit">提交</Button>
              </div>
            </Form>
          </>
        )}
      </Modal>
      
      {/* 编辑章节弹窗 */}
      <Modal
        title="编辑章节"
        visible={showEditChapterModal}
        onCancel={() => setShowEditChapterModal(false)}
        width={500}
        footer={null}
      >
        {currentChapter && (
          <Form
            onSubmit={handleEditChapter}
            layout="vertical"
            initValues={currentChapter}
          >
            <Form.Input 
              field="title" 
              label="标题" 
              placeholder="请输入章节标题" 
              rules={[{ required: true, message: '请输入章节标题' }]} 
            />
            <Form.Input 
              field="number" 
              label="章节编号" 
              placeholder="请输入章节编号" 
              rules={[{ required: true, message: '请输入章节编号' }]} 
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button type="tertiary" onClick={() => setShowEditChapterModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit">提交</Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}