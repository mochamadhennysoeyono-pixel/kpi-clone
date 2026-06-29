// src/ai/flows/kpi-feedback-coach-flow.ts
import "server-only";
/**
 * @fileOverview Pelatih Kinerja AI yang memberikan umpan balik dan saran berdasarkan data KPI.
 *
 * - getKpiFeedback - Fungsi yang menghasilkan umpan balik untuk seorang karyawan.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { type KpiFeedbackInput, KpiFeedbackOutputSchema, type KpiFeedbackOutput } from '@/types';


export async function getKpiFeedback(
  input: KpiFeedbackInput
): Promise<KpiFeedbackOutput> {
  const result = await ai.generate({
    model: 'googleai/gemini-3-flash-preview',
    prompt: `Anda adalah seorang Pelatih Kinerja AI yang empatik, suportif, dan ahli dalam memberikan umpan balik. Tugas Anda adalah menganalisis data kinerja seorang karyawan dan memberikan ringkasan yang konstruktif dalam format Markdown.

Tujuan Anda:
1.  Bantu karyawan (bernama {{{employeeName}}}) memahami kinerjanya.
2.  Sorot kekuatan utama mereka (pencapaian terbaik).
3.  Identifikasi area yang paling butuh peningkatan dengan cara yang positif dan tidak menghakimi.
4.  Berikan 1-2 saran konkret dan dapat ditindaklanjuti untuk periode berikutnya.

Data Kinerja Karyawan:
- Nama: {{{employeeName}}}
- Skor Total: {{{overallScore}}}
- Status Kinerja: {{{performanceStatus}}}
- Rincian Pencapaian:
  {{#each achievements}}
  - Indikator: {{this.indicatorName}} (Kategori: {{this.category}}, Bobot: {{this.weight}}%)
    - Target: {{this.target}}
    - Aktual: {{this.actual}}
    - Skor: {{this.score}}
  {{/each}}

Struktur Umpan Balik (Gunakan format Markdown):
- Mulai dengan sapaan positif kepada {{{employeeName}}}.
- Berikan ringkasan singkat tentang kinerja keseluruhan berdasarkan skor dan status.
- Buat sub-judul "🌟 Poin Kuat Anda". Di bawahnya, sebutkan 1-2 indikator dengan pencapaian terbaik (skor tertinggi relatif terhadap bobotnya) dan berikan pujian.
- Buat sub-judul "💡 Area untuk Berkembang". Di bawahnya, sebutkan 1-2 indikator dengan skor terendah. Jelaskan ini sebagai "peluang" atau "area fokus", bukan kegagalan.
- Buat sub-judul "🚀 Rencana Aksi". Berikan 1-2 saran yang praktis dan relevan untuk membantu meningkatkan area yang perlu dikembangkan.
- Akhiri dengan kalimat yang memotivasi.

Gunakan bahasa yang sederhana, langsung, dan menyemangati.
`,
    input,
    output: { schema: KpiFeedbackOutputSchema },
  });
  return result.output!;
}
