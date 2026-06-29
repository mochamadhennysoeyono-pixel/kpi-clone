// src/actions/kpiFeedbackCoach.action.ts
"use server";

import { getKpiFeedback } from "@/ai/flows/kpi-feedback-coach-flow";
import type { KpiFeedbackInput, KpiFeedbackOutput } from "@/types";

export async function runGetKpiFeedback(input: KpiFeedbackInput): Promise<{ success: boolean; data?: KpiFeedbackOutput; error?: string }> {
  try {
    const result = await getKpiFeedback(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`[COACH_ACTION_ERROR]`, error);
    return {
      success: false,
      error: `AI Error: ${error.message || 'An unknown error occurred.'}`,
    };
  }
}
