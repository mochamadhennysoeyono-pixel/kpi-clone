// src/ai/flows/ai-kpi-suggestion.ts
import "server-only";
/**
 * @fileOverview Alat bantu saran KPI bertenaga AI yang merekomendasikan indikator KPI yang relevan berdasarkan jabatan dan departemen.
 *
 * - suggestKpiIndicators - Fungsi yang menyarankan indikator KPI berdasarkan jabatan dan departemen.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { SuggestKpiIndicatorsInputSchema, type SuggestKpiIndicatorsInput, SuggestKpiIndicatorsOutputSchema, type SuggestKpiIndicatorsOutput } from '@/types';


export async function suggestKpiIndicators(
  input: SuggestKpiIndicatorsInput
): Promise<SuggestKpiIndicatorsOutput> {
  const result = await ai.generate({
    model: 'googleai/gemini-3-flash-preview',
    prompt: `Anda adalah seorang ahli dalam Key Performance Indicators (KPI). Berdasarkan jabatan dan departemen, Anda akan menyarankan indikator KPI yang relevan.

Jabatan: {{{jobTitle}}}
Departemen: {{{department}}}

Sarankan setidaknya 5 indikator KPI yang relevan dengan jabatan dan departemen tersebut. KPI harus spesifik, terukur, dapat dicapai, relevan, dan berbatas waktu (SMART). Kembalikan saran KPI sebagai daftar string.

Saran KPI:`,
    output: { schema: SuggestKpiIndicatorsOutputSchema },
    input, // Pass input for templating
  });
  return result.output!;
}
