// src/ai/flows/scenario-planner-flow.ts
import "server-only";
/**
 * @fileOverview Perencana Skenario "Bagaimana Jika" bertenaga AI untuk analisis strategis KPI.
 *
 * - planScenario - Menganalisis potensi dampak dari sebuah skenario bisnis terhadap KPI tim.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { type ScenarioPlannerInput, ScenarioPlannerOutputSchema, type ScenarioPlannerOutput } from '@/types';


export async function planScenario(
  input: ScenarioPlannerInput
): Promise<ScenarioPlannerOutput> {
  const result = await ai.generate({
    model: 'googleai/gemini-3-flash-preview',
    prompt: `Anda adalah seorang Konsultan Strategi Bisnis dan ahli KPI. Tugas Anda adalah menganalisis skenario "bagaimana jika" yang diajukan oleh seorang manajer dan memberikan analisis mendalam berdasarkan data KPI tim yang ada.

**Konteks Tim Saat Ini:**
Berikut adalah daftar KPI utama untuk tim, beserta target, bobot, dan kinerja rata-rata mereka baru-baru ini:
{{#each teamContext}}
- **Indikator:** {{this.indicator}}
  - **Kategori:** {{this.category}}
  - **Target Saat Ini:** {{this.target}}
  - **Bobot:** {{this.weight}}%
  - **Skor Rata-Rata Terakhir:** {{this.averageScore}}
{{/each}}

**Skenario dari Manajer:**
"{{{scenarioDescription}}}"

**Tugas Anda (Struktur Jawaban dalam Markdown):**
1.  **Ringkasan Skenario:** Ulangi secara singkat skenario yang Anda pahami.
2.  **Analisis Dampak Langsung:**
    *   Identifikasi KPI mana yang akan paling terpengaruh secara langsung oleh skenario ini.
    *   Jelaskan potensi dampaknya terhadap KPI tersebut (positif atau negatif).
3.  **Potensi Tantangan & Risiko:**
    *   Berdasarkan kinerja masa lalu (skor rata-rata), identifikasi tantangan terbesar yang mungkin dihadapi tim untuk mencapai skenario ini.
    *   Pikirkan tentang potensi risiko yang tidak terduga (misalnya, penurunan kualitas jika kuantitas dikejar, kelelahan tim, dll.).
4.  **Saran Penyesuaian KPI:**
    *   Sarankan 1-2 penyesuaian konkret pada KPI yang ada (misalnya, "Pertimbangkan menaikkan target X menjadi Y" atau "Mungkin perlu menurunkan bobot Z sementara").
    *   Sarankan 1 indikator baru (jika perlu) untuk mengukur keberhasilan skenario ini atau untuk memitigasi risikonya (misalnya, jika mengejar kuantitas, tambahkan KPI 'Tingkat Kepuasan Pelanggan').
5.  **Kesimpulan:** Berikan ringkasan singkat dan kalimat penutup yang strategis.

Gunakan bahasa yang profesional, jelas, dan berorientasi pada data.
`,
    input,
    output: { schema: ScenarioPlannerOutputSchema },
  });
  return result.output!;
}
