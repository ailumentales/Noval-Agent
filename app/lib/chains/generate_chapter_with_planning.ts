import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from "langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CreateChapterTool } from '@/app/lib/langchain-tools';
import { outlineOperations, chapterOperations } from '@/app/lib/database';


export async function generateChapterListWithPlanning(autoGenerateCount: number) {
    
}