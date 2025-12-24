'use client';
import { Modal, Button, Input, Select, TextArea } from '@douyinfe/semi-ui';
import { Outline } from '@/app/lib/database';
import { useState } from 'react';

interface AutoGenerateModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  outlines: Outline[];
}

const AutoGenerateModal: React.FC<AutoGenerateModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  outlines
}) => {
  // 内部状态管理
  const [autoGenerateCount, setAutoGenerateCount] = useState<number>(1);
  const [selectedOutlineId, setSelectedOutlineId] = useState<number | undefined>(undefined);
  const [prompt, setPrompt] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);

  // 过滤出类型为"大纲"的选项
  const outlineOptions = outlines
    .filter(outline => outline.type === '大纲')
    .map(outline => ({
      value: outline.id,
      label: outline.name,
      content: outline.content
    }));

  // 自动生成章节列表
  const handleGenerate = async () => {
    try {
      if (!autoGenerateCount || autoGenerateCount < 1) {
        alert('请输入有效的章节数量');
        return;
      }
      
      setGenerating(true);
      
      // 调用后端API生成章节列表
      const response = await fetch('/api/ai/generate-chapters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          autoGenerateCount,
          outlineId: selectedOutlineId,
          prompt
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成章节列表失败');
      }
      
      const { content: aiResponse } = await response.json();
      console.log('[AutoGenerate] 完整AI响应:', aiResponse);
      
      // 调用成功回调
      onSuccess();
      
      // 关闭模态框
      onCancel();
      
      alert(`成功生成章节`);
    } catch (error) {
      console.error('自动生成章节失败:', error);
      alert(error instanceof Error ? error.message : '自动生成章节失败，请检查控制台获取更多信息');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      title="自动生成章节列表"
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleGenerate} 
          disabled={generating}
        >
          {generating ? '生成中...' : '生成章节'}
        </Button>
      ]}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">关联大纲</label>
          <Select
            value={selectedOutlineId}
            onChange={(value) => setSelectedOutlineId(value as number)}
            placeholder="请选择关联的大纲"
            className="w-full"
            optionList={outlineOptions}
            style={{ width: '100%' }}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">预期章节数量</label>
          <Input
            type="number"
            min={1}
            max={50}
            value={autoGenerateCount}
            onChange={(value) => setAutoGenerateCount(Number(value) || 1)}
            placeholder="请输入章节数量"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">范围描述</label>
          <TextArea
            value={prompt}
            onChange={(value) => setPrompt(value as string)}
            placeholder="请输入章节生成的范围描述和要求"
            maxCount={500}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </Modal>
  );
};

export default AutoGenerateModal;
