'use client';
import { Card, TextArea, Button } from '@douyinfe/semi-ui';
import { useState, useEffect } from 'react';

// 从database.ts导入类型定义
import { Outline, Chapter } from '../../lib/database';

// 扩展接口以支持组件需要的额外属性
interface ExtendedOutline extends Outline {
  wordCount?: string;
}

interface ExtendedChapter extends Chapter {
  wordCount?: string;
}

type ItemType = 'outline' | 'chapter' | null;

interface AIInteractionProps {
  itemType: ItemType;
  itemId: number | null;
  onUpdate?: () => void;
}

const AIInteraction: React.FC<AIInteractionProps> = ({
  itemType,
  itemId,
  onUpdate
}) => {
  const [item, setItem] = useState<ExtendedOutline | ExtendedChapter | null>(null);
  const [promptText, setPromptText] = useState('');
  const [contentText, setContentText] = useState('');
  const [thinkText, setThinkText] = useState('');
  const [generating, setGenerating] = useState(false);

  // 加载选中项的详细信息
  useEffect(() => {
    if (!itemType || !itemId) {
      setItem(null);
      setPromptText('');
      setContentText('');
      setThinkText('');
      return;
    }

    const fetchItemDetails = async () => {
      try {
        const response = await fetch(`/api/${itemType}s/${itemId}`);
        if (!response.ok) {
          throw new Error(`获取${itemType}详情失败`);
        }
        const data = await response.json();
        
        // 格式化数据
        const formattedData = {
          ...data,
          wordCount: data.word_count ? data.word_count.toLocaleString() : '0'
        };
        
        setItem(formattedData);
        setPromptText(data.prompt || '');
        setContentText(data.content || '');
      } catch (error) {
        console.error('加载详情失败:', error);
        alert(error instanceof Error ? error.message : '加载详情失败，请检查控制台获取更多信息');
      }
    };

    fetchItemDetails();
  }, [itemType, itemId]);

  // 判断是否为章节类型
  const isChapter = (item: ExtendedOutline | ExtendedChapter | null): item is ExtendedChapter => {
    return item !== null && 'number' in item;
  };

  // 生成AI内容
  const handleGenerate = async () => {
    if (!itemType || !itemId || !promptText.trim()) {
      alert('请先选择一个大纲或章节并输入AI请求内容');
      return;
    }

    try {
      setGenerating(true);
      setThinkText('');

      // 准备请求参数
      const apiUrl = itemType === 'outline' 
        ? '/api/ai/generate-outline-content'
        : '/api/ai/generate-chapter-content';
      
      const requestBody = {
        [itemType === 'outline' ? 'outlineId' : 'chapterId']: itemId,
        promptText,
        oldContent: item?.content || ''
      };

      // 调用后端API获取流式响应
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI生成失败');
      }

      // 处理SSE响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法获取响应流');
      }

      let accumulatedContent = '';
      let accumulatedThinkContent = '';
      let inThinkMode = false;

      const processContent = (content: string) => {
        let currentContent = content;
        let newThinkText = null;
        let newContentText = '';

        while (currentContent.length > 0) {
          if (inThinkMode) {
            // 寻找结束标签</think>
            const endTagIndex = currentContent.indexOf('</think>');
            if (endTagIndex !== -1) {
              // 找到完整的思考内容，先更新到结束标签前的内容
              accumulatedThinkContent += currentContent.slice(0, endTagIndex);
              newThinkText = accumulatedThinkContent;
              accumulatedThinkContent = '';
              inThinkMode = false;
              // 跳过结束标签
              currentContent = currentContent.slice(endTagIndex + 8);
            } else {
              // 没有找到结束标签，将所有内容添加到思考内容并实时更新
              accumulatedThinkContent += currentContent;
              newThinkText = accumulatedThinkContent;
              currentContent = '';
            }
          } else {
            // 寻找开始标签<think>
            const startTagIndex = currentContent.indexOf('<think>');
            if (startTagIndex !== -1) {
              // 找到开始标签，将标签前的内容添加到主内容
              newContentText += currentContent.slice(0, startTagIndex);
              // 跳过开始标签
              currentContent = currentContent.slice(startTagIndex + 7);
              inThinkMode = true;
            } else {
              // 没有找到开始标签，将所有内容添加到主内容
              newContentText += currentContent;
              currentContent = '';
            }
          }
        }

        return { newThinkText, newContentText };
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsedData = JSON.parse(data);
              if (parsedData.content) {
                // 处理当前chunk的内容
                const { newThinkText, newContentText } = processContent(parsedData.content);
                
                // 更新主内容
                if (newContentText) {
                  accumulatedContent += newContentText;
                  setContentText(accumulatedContent);
                }
                
                // 更新思考内容（实时更新，不需要等待完整的标签）
                if (newThinkText !== null) {
                  setThinkText(newThinkText);
                }
              }
              // 支持toolCallResult，用于工具调用结果
              if (parsedData.toolCallResult) {
                // 可以根据需要处理工具调用结果
                console.log('工具调用结果:', parsedData.toolCallResult);
              }
            } catch (error) {
              console.error('解析SSE数据失败:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('生成内容失败:', error);
      alert(error instanceof Error ? error.message : '生成内容失败，请检查控制台获取更多信息');
    } finally {
      setGenerating(false);
    }
  };

  // 保存AI内容
  const handleSaveContent = async () => {
    if (!itemType || !itemId) {
      alert('请先选择一个大纲或章节');
      return;
    }

    try {
      // 更新AI内容
      const response = await fetch(`/api/${itemType}s/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          content: contentText
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存内容失败');
      }

      // 通知父组件更新数据
      if (onUpdate) {
        onUpdate();
      }

      alert('保存成功');
    } catch (error) {
      console.error('保存内容失败:', error);
      alert(error instanceof Error ? error.message : '保存内容失败，请检查控制台获取更多信息');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      {/* 当前选中项标题 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {item ? 
            (isChapter(item) ? 
              `第${item.number}章 ${item.title}` : 
              `大纲：${item.name}`) : 
            '请选择一个大纲或章节'}
        </h2>
        {item && (
          <p className="text-sm text-gray-500 mt-1">
            {isChapter(item) ? `章节编号：${item.number} | ` : ''}字数：{contentText.length}
          </p>
        )}
      </div>
      
      {/* 顶部输入框 - 固定最小高度 */}
      <Card className="mb-6 flex-shrink-0" bodyStyle={{ height: 'calc(100% - 50px)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">输入请求</h3>
          <Button type="primary" size="large" onClick={handleGenerate} disabled={generating}>
            {generating ? '生成中...' : '开始生成'}
          </Button>
        </div>
        <TextArea
          placeholder="请输入与AI的对话请求..."
          style={{ width: '100%', height: '100%', minHeight: '150px' }}
          value={promptText}
          onChange={setPromptText}
        />
      </Card>
      
      {/* 底部输出区域 - 占满剩余高度 */}
      <Card className="flex-1 flex flex-col" bodyStyle={{ height: 'calc(100% - 50px)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">AI输出</h3>
          <Button type="primary" size="small" onClick={handleSaveContent}>
            保存
          </Button>
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
              onChange={setContentText}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIInteraction;