'use client';
import { Modal, Button, Input } from '@douyinfe/semi-ui';

interface AutoGenerateModalProps {
  visible: boolean;
  onCancel: () => void;
  onGenerate: () => void;
  generating: boolean;
  autoGenerateCount: number;
  onCountChange: (count: number) => void;
}

const AutoGenerateModal: React.FC<AutoGenerateModalProps> = ({
  visible,
  onCancel,
  onGenerate,
  generating,
  autoGenerateCount,
  onCountChange
}) => {
  return (
    <Modal
      title="自动生成章节列表"
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={onGenerate} disabled={generating}>
          {generating ? '生成中...' : '生成章节'}
        </Button>
      ]}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">预期章节数量</label>
          <Input
            type="number"
            min={1}
            max={50}
            value={autoGenerateCount}
            onChange={(value) => onCountChange(Number(value) || 1)}
            placeholder="请输入章节数量"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </Modal>
  );
};

export default AutoGenerateModal;
