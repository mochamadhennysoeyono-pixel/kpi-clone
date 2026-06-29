// src/actions/conversationalAssistant.action.ts
"use server";

import { askAssistant } from "@/ai/flows/conversational-assistant-flow";
import type { ConversationalAssistantInput, ConversationalAssistantOutput } from "@/types";

export async function runAskAssistant(input: ConversationalAssistantInput): Promise<{ success: boolean; data?: ConversationalAssistantOutput; error?: string }> {
  try {
    const result = await askAssistant(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`[ASSIST_ACTION_ERROR]`, error);
    return {
      success: false,
      error: `AI Error: ${error.message || 'An unknown error occurred.'}`,
    };
  }
}
