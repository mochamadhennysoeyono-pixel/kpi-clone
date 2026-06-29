import { config } from 'dotenv';
config();

import '@/ai/flows/kpi-wizard-flow.ts';
import '@/ai/flows/kpi-feedback-coach-flow.ts';
import '@/ai/flows/scenario-planner-flow.ts';
import '@/ai/flows/page-assistant-flow.ts';
import '@/ai/flows/conversational-assistant-flow.ts';
import '@/ai/flows/situational-awareness-flow.ts';
// This file is for DEVELOPMENT only.
// It is used to register all flows with Genkit for local development and testing.
// In production, flows are imported directly by the components that use them.



