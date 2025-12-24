'use client';
import { Layout, List, Button, Tabs } from '@douyinfe/semi-ui';
import { IconPlusCircle, IconEdit, IconDelete } from '@douyinfe/semi-icons';
import { useEffect, useState } from 'react';

// 导入组件
import AutoGenerateModal from './components/chapter/AutoGenerateModal';
import OutlineModal from './components/outline/OutlineModal';
import ChapterModal from './components/chapter/ChapterModal';
import AIInteraction from './components/ai/AIInteraction';

// 导入类型定义
import { Outline, Chapter } from './lib/database';

// 扩展类型定义
interface FormattedChapter extends Chapter {
  wordCount: string;
}

const { Header, Sider, Content } = Layout;

export default function Home() {
  // 状态管理
  const [chaptersList, setChaptersList] = useState<FormattedChapter[]>([]);
  const [settingsList, setSettingsList] = useState<Outline[]>([]);
  const [showOutlineModal, setShowOutlineModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showEditOutlineModal, setShowEditOutlineModal] = useState(false);
  const [showEditChapterModal, setShowEditChapterModal] = useState(false);
  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
  const [currentOutline, setCurrentOutline] = useState<Outline | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  // 选中项目状态
  const [selectedOutline, setSelectedOutline] = useState<Outline | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  
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
      const formattedChapters = data.map((chapter: Chapter) => ({
        ...chapter,
        wordCount: chapter.word_count ? chapter.word_count.toLocaleString() : '0'
      }));
      setChaptersList(formattedChapters);
    } catch (error) {
      console.error('获取章节失败:', error);
      alert(error instanceof Error ? error.message : '获取章节失败，请检查控制台获取更多信息');
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
                                onClick={async (e) => {
                                  e.stopPropagation(); // 阻止事件冒泡到List.Item
                                  if (confirm('确定要删除这个设定吗？')) {
                                    try {
                                      const response = await fetch(`/api/outlines/${setting.id}`, {
                                        method: 'DELETE'
                                      });
                                      if (response.ok) {
                                        fetchOutlines();
                                        // 如果删除的是当前选中的大纲，清除选中状态
                                        if (selectedOutline?.id === setting.id) {
                                          setSelectedOutline(null);
                                        }
                                      }
                                    } catch (error) {
                                      console.error('删除设定失败:', error);
                                      alert('删除设定失败，请稍后重试');
                                    }
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
                              onClick={async (e) => {
                                e.stopPropagation(); // 阻止事件冒泡到List.Item
                                if (confirm('确定要删除这个章节吗？')) {
                                  try {
                                    const response = await fetch(`/api/chapters/${chapter.id}`, {
                                      method: 'DELETE'
                                    });
                                    if (response.ok) {
                                      fetchChapters();
                                      // 如果删除的是当前选中的章节，清除选中状态
                                      if (selectedChapter?.id === chapter.id) {
                                        setSelectedChapter(null);
                                      }
                                    }
                                  } catch (error) {
                                    console.error('删除章节失败:', error);
                                    alert('删除章节失败，请稍后重试');
                                  }
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
          </Content>
        </Sider>
        
        {/* 右侧内容区域 */}
        <Layout className="flex-1 flex flex-col">
          {/* 使用AI交互组件 */}
          <AIInteraction
            itemType={selectedOutline ? 'outline' : selectedChapter ? 'chapter' : null}
            itemId={selectedOutline?.id || selectedChapter?.id || null}
            onUpdate={() => {
              if (selectedOutline) {
                fetchOutlines();
              }
              if (selectedChapter) {
                fetchChapters();
              }
            }}
          />
        </Layout>
      </Layout>
      
      {/* 大纲模态框 */}
      <OutlineModal
        visible={showOutlineModal}
        onCancel={() => setShowOutlineModal(false)}
        onSuccess={fetchOutlines}
      />
      
      <OutlineModal
        visible={showEditOutlineModal}
        onCancel={() => setShowEditOutlineModal(false)}
        onSuccess={fetchOutlines}
        outline={currentOutline}
      />
      
      {/* 章节模态框 */}
      <ChapterModal
        visible={showChapterModal}
        onCancel={() => setShowChapterModal(false)}
        onSuccess={fetchChapters}
      />
      
      <ChapterModal
        visible={showEditChapterModal}
        onCancel={() => setShowEditChapterModal(false)}
        onSuccess={fetchChapters}
        chapter={currentChapter}
      />
      
      {/* 自动生成章节列表模态框 */}
      <AutoGenerateModal
        visible={showAutoGenerateModal}
        onCancel={() => setShowAutoGenerateModal(false)}
        onSuccess={fetchChapters}
        outlines={settingsList}
      />
    </div>
  );
}