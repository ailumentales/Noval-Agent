'use client';
import { Modal, Button, Form } from '@douyinfe/semi-ui';
        
// 从database.ts导入类型定义
import { Chapter } from '../../lib/database';

// 扩展Chapter接口以支持Form组件需要的属性
interface FormChapter extends Chapter {
  wordCount?: string;
}

interface ChapterModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  chapter?: Chapter | null;
}

const ChapterModal: React.FC<ChapterModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  chapter
}) => {
  const isEditMode = !!chapter;

  const handleSubmit = async (values: FormChapter) => {
    try {
      if (isEditMode && chapter?.id) {
        // 编辑章节
        const response = await fetch(`/api/chapters/${chapter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '编辑章节失败');
        }
      } else {
        // 新增章节
        const response = await fetch('/api/chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '新增章节失败');
        }
      }
      
      onSuccess();
      onCancel();
    } catch (error) {
      console.error(isEditMode ? '编辑章节失败:' : '新增章节失败:', error);
      alert(error instanceof Error ? error.message : `${isEditMode ? '编辑章节' : '新增章节'}失败，请检查控制台获取更多信息`);
    }
  };

  return (
    <Modal
      title={isEditMode ? "编辑章节" : "新增章节"}
      visible={visible}
      onCancel={onCancel}
      width={500}
      footer={null}
    >
      <Form
        onSubmit={handleSubmit}
        layout="vertical"
        {...(chapter && { initValues: chapter })}
      >
        <Form.Input 
          field="title" 
          label="标题" 
          placeholder="请输入章节标题" 
          rules={[{ required: true, message: '请输入章节标题' }]} 
        />
        {isEditMode && (
          <Form.Input 
            field="number" 
            label="章节编号" 
            placeholder="请输入章节编号" 
            rules={[{ required: true, message: '请输入章节编号' }]} 
          />
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button type="tertiary" onClick={onCancel}>取消</Button>
          <Button type="primary" htmlType="submit">提交</Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ChapterModal;
