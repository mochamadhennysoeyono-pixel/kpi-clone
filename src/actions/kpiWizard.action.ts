// src/actions/kpiWizard.action.ts
"use server";

import { kpiWizardFlow } from "@/ai/flows/kpi-wizard-flow";
import type { KpiWizardInput, InterviewPhaseOutput, DesignPhaseOutput } from "@/types";

export async function runKpiWizard(input: KpiWizardInput): Promise<{ success: boolean; data?: InterviewPhaseOutput | DesignPhaseOutput; error?: string }> {
  try {
    const result = await kpiWizardFlow(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`[WIZ_ACTION_ERROR]`, error);
    return {
      success: false,
      error: `AI Error: ${error.message || 'An unknown error occurred.'}`,
    };
  }
}
