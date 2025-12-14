'use client';
import { Modal, Button, Form, Select } from '@douyinfe/semi-ui';

// 从database.ts导入类型定义
import { Outline } from '../../lib/database';

interface OutlineModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  outline?: Outline | null;
}

const OutlineModal: React.FC<OutlineModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  outline
}) => {
  const isEditMode = !!outline;

  const handleSubmit = async (values: Outline) => {
    try {
      if (isEditMode && outline?.id) {
        // 编辑设定
        console.log('编辑设定提交的数据:', values);
        console.log('当前大纲ID:', outline.id);
        
        const response = await fetch(`/api/outlines/${outline.id}`, {
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
      } else {
        // 新增设定
        const response = await fetch('/api/outlines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '新增设定失败');
        }
      }
      
      onSuccess();
      onCancel();
    } catch (error) {
      console.error(isEditMode ? '编辑设定失败:' : '新增设定失败:', error);
      alert(error instanceof Error ? error.message : `${isEditMode ? '编辑设定' : '新增设定'}失败，请检查控制台获取更多信息`);
    }
  };

  return (
    <Modal
      title={isEditMode ? "编辑设定" : "新增设定"}
      visible={visible}
      onCancel={onCancel}
      width={500}
      footer={null}
    >
      <Form
        onSubmit={handleSubmit}
        layout="vertical"
        {...(outline && { initValues: outline })}
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
          <Button type="tertiary" onClick={onCancel}>取消</Button>
          <Button type="primary" htmlType="submit">提交</Button>
        </div>
      </Form>
    </Modal>
  );
};

export default OutlineModal;
