// src/actions/scenarioPlanner.action.ts
"use server";

import { planScenario } from "@/ai/flows/scenario-planner-flow";
import type { ScenarioPlannerInput, ScenarioPlannerOutput } from "@/types";

export async function runPlanScenario(input: ScenarioPlannerInput): Promise<{ success: boolean; data?: ScenarioPlannerOutput; error?: string }> {
  try {
    const result = await planScenario(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`[SCENARIO_ACTION_ERROR]`, error);
    return {
      success: false,
      error: `AI Error: ${error.message || 'An unknown error occurred.'}`,
    };
  }
}
