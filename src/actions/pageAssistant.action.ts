// src/actions/pageAssistant.action.ts
"use server";

import { getPageExplanation } from "@/ai/flows/page-assistant-flow";
import type { PageContextInput, PageExplanationOutput } from "@/types";

export async function runGetPageExplanation(input: PageContextInput): Promise<{ success: boolean; data?: PageExplanationOutput; error?: string }> {
  try {
    const result = await getPageExplanation(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`[PAGE_ASSIST_ACTION_ERROR]`, error);
    return {
      success: false,
      error: `AI Error: ${error.message || 'An unknown error occurred.'}`,
    };
  }
}
