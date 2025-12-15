# Novel Agent - AI拾光研发小说创作助手

Novel Agent是一个基于Next.js和OpenAI API构建的AI小说创作助手，提供了完整的小说章节管理和AI辅助创作功能。

## 功能特点

### 章节管理
- 创建、编辑、删除小说章节
- 自动生成章节列表
- 章节编号和字数统计
- 章节内容实时编辑和保存

### AI辅助创作
- 集成OpenAI API，支持流式输出和一次性调用
- 按类型信息（大纲/章节类型、序号）调用AI
- AI思考内容显示（最多4行）
- MCP（Model Context Protocol）工具调用支持
- 数字乘法等工具调用功能

### 大纲管理
- 创建、编辑、删除小说大纲
- 多类型大纲支持（人物、背景、设定、大纲、其他）
- 大纲内容与章节创作关联

### 自动生成
- 自动生成章节列表功能
- 支持指定章节数量
- AI根据大纲设定生成章节内容

## 技术栈

- **前端框架**: Next.js 16 (App Router) + React 19
- **UI组件库**: Semi UI
- **AI接口**: OpenAI API (v6.10.0)
- **MCP支持**: @modelcontextprotocol/sdk
- **数据库**: SQL.js (浏览器内SQLite)
- **样式**: Tailwind CSS
- **开发语言**: TypeScript

## 部署和配置

### 环境要求
- Node.js 18.x 或更高版本
- npm 或 yarn 包管理器

### 安装和运行

1. 克隆项目
```bash
git clone <项目仓库地址>
cd novel-agent
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
创建 `.env` 文件并配置以下内容：
```env
# OpenAI API 配置
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo

# 项目配置
NEXT_PUBLIC_APP_NAME=Novel Agent
```

4. 启动开发服务器
```bash
npm run dev
```

5. 构建生产版本
```bash
npm run build
```

6. 运行生产版本
```bash
npm start
```

## 使用说明

### 章节管理

1. **创建章节**
   - 点击左侧章节列表中的"添加章节"按钮
   - 输入章节标题和内容
   - 点击提交按钮

2. **编辑章节**
   - 选择要编辑的章节
   - 点击编辑按钮
   - 修改章节内容
   - 点击提交按钮

3. **自动生成章节**
   - 点击章节列表顶部的"自动生成章节列表"按钮
   - 输入预期章节数量
   - 点击生成按钮
   - AI将根据现有大纲生成指定数量的章节

### AI辅助创作

1. **生成章节内容**
   - 选择一个章节
   - 在右侧编辑区域输入创作提示
   - 点击"开始生成"按钮
   - AI将生成章节内容并显示在编辑区域

2. **使用工具调用**
   - AI可以调用内置工具进行计算和操作
   - 支持多轮工具调用（如5×7，结果×20）
   - 工具调用结果将显示在AI输出区域

### 大纲管理

1. **创建大纲**
   - 点击左侧大纲列表中的"添加设定"按钮
   - 输入大纲名称和内容
   - 选择大纲类型
   - 点击提交按钮

2. **编辑大纲**
   - 选择要编辑的大纲
   - 点击编辑按钮
   - 修改大纲内容
   - 点击提交按钮

## 项目结构

```
app/
  api/               # API路由
    ai/chat/route.ts # AI聊天API
    chapters/        # 章节管理API
    outlines/        # 大纲管理API
  lib/               # 核心功能库
    ai-client.tsx    # AI客户端组件
    ai-service.ts    # AI服务实现
    database.ts      # 数据库操作
    mcp-service.ts   # MCP服务实现
  page.tsx           # 主页面组件
  layout.tsx         # 页面布局
  globals.css        # 全局样式

public/              # 静态资源
package.json         # 项目配置
next.config.ts       # Next.js配置
README.md            # 项目说明文档
```

## 开发说明

### 调试日志
- AI调用日志显示在浏览器控制台
- 工具调用日志以`[MCP]`前缀显示
- 错误信息将在界面上显示并记录到控制台

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进项目。

## 联系方式

如有问题或建议，请通过项目仓库提交Issue。
