// src/actions/aiKpiSuggestion.action.ts
"use server";

import { suggestKpiIndicators } from "@/ai/flows/ai-kpi-suggestion";
import type { SuggestKpiIndicatorsInput, SuggestKpiIndicatorsOutput } from "@/types";

export async function runSuggestKpiIndicators(input: SuggestKpiIndicatorsInput): Promise<{ success: boolean; data?: SuggestKpiIndicatorsOutput; error?: string }> {
  try {
    const result = await suggestKpiIndicators(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`[SUGGEST_ACTION_ERROR]`, error);
    return {
      success: false,
      error: `AI Error: ${error.message || 'An unknown error occurred.'}`,
    };
  }
}
