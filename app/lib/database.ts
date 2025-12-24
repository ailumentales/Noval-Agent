import fs from 'fs';
import path from 'path';

// 定义数据结构
export interface Outline {
  id: number;
  name: string;
  type: string;
  prompt: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: number;
  title: string;
  number: number;
  word_count: number;
  prompt: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Database {
  outlines: Outline[];
  chapters: Chapter[];
  nextOutlineId: number;
  nextChapterId: number;
}

// 数据库文件路径
const dbPath = path.join(process.cwd(), 'database.json');

// 初始化数据库
const initializeDatabase = (): Database => {
  try {
    // 检查数据库文件是否存在
    if (fs.existsSync(dbPath)) {
      // 如果存在，读取数据库文件
      const data = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(data);
    } else {
      // 如果不存在，创建新数据库
      const newDb: Database = {
        outlines: [
          {
            id: 1,
            name: '故事大纲',
            type: '大纲',
            prompt: '请根据以下要求生成故事大纲：1. 明确故事主线；2. 划分三幕结构；3. 列出关键情节点。',
            content: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 2,
            name: '主要人物',
            type: '人物',
            prompt: '请根据以下要求生成主要人物设定：1. 列出主角与配角；2. 描述人物背景与动机；3. 明确人物关系。',
            content: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        chapters: [],
        nextOutlineId: 1,
        nextChapterId: 1
      };
      // 保存数据库到文件
      saveDatabase(newDb);
      return newDb;
    }
  } catch (error) {
    console.error('数据库初始化失败:', error);
    // 返回默认数据库
    return {
      outlines: [],
      chapters: [],
      nextOutlineId: 1,
      nextChapterId: 1
    };
  }
};

// 保存数据库更改
const saveDatabase = (db: Database): void => {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
};

// 大纲相关操作
export const outlineOperations = {
  // 获取所有大纲
  getAll: async () => {
    const db = initializeDatabase();
    return db.outlines;
  },
  
  // 添加新大纲
  add: async (name: string, type: string, prompt?: string, content?: string) => {
    const db = initializeDatabase();
    const now = new Date().toISOString();
    const newOutline: Outline = {
      id: db.nextOutlineId++,
      name,
      type,
      prompt: prompt || '',
      content: content || '',
      created_at: now,
      updated_at: now
    };
    db.outlines.push(newOutline);
    saveDatabase(db);
    return { lastInsertRowid: newOutline.id };
  },
  
  // 更新大纲
  update: async (id: number, data: Partial<{name: string, type: string, prompt: string, content: string}>) => {
    console.log('数据库层：收到大纲更新请求', { id, data });
    const db = initializeDatabase();
    const outlineIndex = db.outlines.findIndex((outline: Outline) => outline.id === id);
    
    if (outlineIndex === -1) {
      console.log('数据库层：未找到对应ID的大纲', { id });
      return { changes: 0 };
    }
    
    console.log('数据库层：找到大纲，准备更新', { originalOutline: db.outlines[outlineIndex] });
    const outline = db.outlines[outlineIndex];
    db.outlines[outlineIndex] = {
      ...outline,
      ...data,
      updated_at: new Date().toISOString()
    };
    
    console.log('数据库层：大纲更新完成，准备保存到文件', { updatedOutline: db.outlines[outlineIndex] });
    saveDatabase(db);
    console.log('数据库层：大纲更新已保存到文件');
    return { changes: 1 };
  },
  
  // 删除大纲
  delete: async (id: number) => {
    const db = initializeDatabase();
    const initialLength = db.outlines.length;
    db.outlines = db.outlines.filter((outline: Outline) => outline.id !== id);
    
    if (db.outlines.length < initialLength) {
      saveDatabase(db);
      return { changes: 1 };
    }
    
    return { changes: 0 };
  },
  
  // 根据ID获取大纲
  getById: async (id: number) => {
    const db = initializeDatabase();
    return db.outlines.find((outline: Outline) => outline.id === id);
  }
};

// 章节相关操作
export const chapterOperations = {
  // 获取所有章节
  getAll: async () => {
    const db = initializeDatabase();
    return db.chapters;
  },
  
  // 添加新章节
  add: async (title: string, prompt?: string, content?: string) => {
    if (!title) {
      throw new Error('章节标题不能为空');
    }
    
    const db = initializeDatabase();
    const now = new Date().toISOString();
    // 自动分配章节编号：当前最大编号 + 1
    const maxNumber = db.chapters.length > 0 
      ? Math.max(...db.chapters.map(chapter => chapter.number || 0)) 
      : 0;
    const newChapter: Chapter = {
      id: db.nextChapterId++,
      title,
      number: maxNumber + 1,
      word_count: content ? content.length : 0,
      prompt: prompt || '',
      content: content || '',
      created_at: now,
      updated_at: now
    };
    
    db.chapters.push(newChapter);
    saveDatabase(db);
    
    console.log('新增章节成功:', newChapter);
    return { lastInsertRowid: newChapter.id };
  },
  
  // 更新章节
  update: async (id: number, data: Partial<{title: string, number: number, prompt: string, content: string}>) => {
    const db = initializeDatabase();
    const chapterIndex = db.chapters.findIndex((chapter: Chapter) => chapter.id === id);
    
    if (chapterIndex === -1) {
      return { changes: 0 };
    }

    // 如果没有number，保持当前编号
    if (!data.number) {
      data.number = db.chapters[chapterIndex].number;
    }
    // 如果没有title，保持当前标题
    if (!data.title) {
      data.title = db.chapters[chapterIndex].title;
    }
    // 如果没有prompt，保持当前prompt
    if (!data.prompt) {
      data.prompt = db.chapters[chapterIndex].prompt;
    }
    // 如果没有content，保持当前内容
    if (!data.content) {
      data.content = db.chapters[chapterIndex].content;
    }
    
    const chapter = db.chapters[chapterIndex];
    const updatedChapter = {
      ...chapter,
      ...data,
      updated_at: new Date().toISOString()
    };
    // 更新字数
    if (data.content !== undefined) {
      updatedChapter.word_count = data.content.length;
    }

    console.log('更新章节:', updatedChapter);
    
    db.chapters[chapterIndex] = updatedChapter;
    saveDatabase(db);
    return { changes: 1 };
  },
  
  // 删除章节
  delete: async (id: number) => {
    const db = initializeDatabase();
    const initialLength = db.chapters.length;
    db.chapters = db.chapters.filter((chapter: Chapter) => chapter.id !== id);
    
    if (db.chapters.length < initialLength) {
      saveDatabase(db);
      return { changes: 1 };
    }
    
    return { changes: 0 };
  },
  
  // 根据ID获取章节
  getById: async (id: number) => {
    const db = initializeDatabase();
    return db.chapters.find((chapter: Chapter) => chapter.id === id);
  },
  
  // 根据章节编号获取章节
  getByNumber: async (number: number) => {
    const db = initializeDatabase();
    if (number < 1) {
      return null;
    }
    return db.chapters.find((chapter: Chapter) => chapter.number === number);
  },
  
  // 根据编号范围获取章节
  getByRange: async (startNumber: number, endNumber: number) => {
    const db = initializeDatabase();
    if (startNumber < 1 || endNumber < startNumber) {
      return [];
    }
    return db.chapters.filter((chapter: Chapter) => 
      chapter.number >= startNumber && chapter.number <= endNumber
    ).sort((a: Chapter, b: Chapter) => a.number - b.number);
  }
};

const databaseOperations = { outlineOperations, chapterOperations };

export default databaseOperations;
