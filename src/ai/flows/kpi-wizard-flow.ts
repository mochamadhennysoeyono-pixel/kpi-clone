// src/ai/flows/kpi-wizard-flow.ts
import "server-only";
/**
 * @fileOverview A multi-phase, flow-based AI KPI Wizard.
 * This file orchestrates the entire KPI generation process, from interview to final design.
 * It should only be invoked via a server action, not directly from the client.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { type KpiWizardInput, InterviewPhaseOutputSchema, type InterviewPhaseOutput, DesignPhaseOutputSchema, type DesignPhaseOutput } from '@/types';


// --- Main Exported Function (Server Action safe) ---
export async function kpiWizardFlow(
  input: KpiWizardInput
): Promise<InterviewPhaseOutput | DesignPhaseOutput> {
  // Context Validation
  if (!input.context.jobTitle || !input.context.department || !input.context.jobLevel) {
      throw new Error("Context inti (role, department, level) belum lengkap.");
  }
  
  // Phase 1: Interview Logic
  if (input.phase === 'INTERVIEW' || input.phase === 'INITIALIZE') {
    
    const objectivesText = input.companyObjectives.map(o => `- ${o.objectiveName} (Perspektif: ${o.bscPerspective})`).join('\n');
    const historyText = (input.history || []).map(m => `- ${m.role}: ${m.content}`).join('\n');
    
    const augmentedInput = {
      ...input,
      objectivesText,
      historyText
    };

    const result = await ai.generate({
      model: 'googleai/gemini-3-flash-preview',
      prompt: `Anda adalah "KIPI" 🤖, seorang konsultan SDM dan ahli KPI yang sangat ramah dan interaktif. Tugas Anda adalah memandu pengguna melalui wawancara strategis untuk merancang KPI.

**KONTEKS PENGGUNA SAAT INI:**
- Jabatan: {{{context.jobTitle}}}
- Departemen: {{{context.department}}}
- Level: {{{context.jobLevel}}}
- Perusahaan: {{{context.company}}}

**TUJUAN STRATEGIS PERUSAHAAN (Jangkar Utama):**
{{{objectivesText}}}

**ATURAN PERCAKAPAN:**
1.  **Satu per Satu:** Ajukan pertanyaan satu per satu. Jangan pernah menanyakan dua hal sekaligus.
2.  **Alur Logis:** Ikuti alur wawancara ini:
    a.  Tanyakan tentang tipe bisnis/industri.
    b.  Gali perspektif **Finansial**.
    c.  Gali perspektif **Pelanggan**.
    d.  Gali perspektif **Proses Bisnis Internal**.
    e.  Gali perspektif **Pembelajaran & Pertumbuhan**.
3.  **Dinamis:** Berikan respons singkat terhadap jawaban pengguna sebelum mengajukan pertanyaan berikutnya agar terasa seperti percakapan nyata. Contoh: "Oke, paham. Kalau begitu...", "Menarik. Selanjutnya...".
4.  **Tentukan Tipe Input:** Untuk setiap pertanyaan yang Anda ajukan, tentukan jenis input yang paling sesuai untuk jawaban pengguna.
    *   Gunakan 'checkbox_financial' **HANYA** untuk pertanyaan pertama tentang kontribusi finansial.
    *   Gunakan 'radio_customer' **HANYA** untuk pertanyaan tentang tipe pelanggan (Internal/Eksternal).
    *   Gunakan 'textarea' untuk semua pertanyaan lain yang membutuhkan jawaban bebas.
    *   Gunakan 'none' HANYA saat Anda telah selesai bertanya dan akan mulai menganalisis.
5.  **Deteksi Akhir Percakapan:** Setelah Anda merasa telah mengumpulkan cukup informasi dari keempat perspektif, set \`isFinished\` menjadi \`true\`. Respons terakhir Anda harus berupa kalimat penutup seperti "Oke, semua informasi sudah lengkap. Aku akan mulai menganalisis dan memberikan saran KPI terbaik untukmu!".

---
**RIWAYAT PERCAKAPAN (Gunakan sebagai konteks untuk pertanyaan selanjutnya):**
{{{historyText}}}

---
**TUGAS ANDA:**
Berdasarkan riwayat percakapan di atas, tentukan dan ajukan **satu pertanyaan berikutnya** yang paling logis sesuai alur. Jika ini adalah awal percakapan (riwayat kosong), mulailah dengan pertanyaan pertama.
`,
      input: augmentedInput,
      output: { schema: InterviewPhaseOutputSchema },
      config: { temperature: 0.3 }
    });
    return { ...(result.output!), phase: "INTERVIEW" };
  }
  
  // Phase 2: Design Logic
  if (input.phase === 'DESIGN') {
      const answersMap: Record<string, string[]> = {
        financial: [], customer: [], internal: [], learning: []
      };
      let currentPerspective: keyof typeof answersMap | null = null;
      
      (input.history || []).forEach(msg => {
        if (typeof msg.content === 'string') {
          if (msg.role === 'model') {
            const content = msg.content.toLowerCase();
            if (content.includes('finansial')) currentPerspective = 'financial';
            else if (content.includes('pelanggan')) currentPerspective = 'customer';
            else if (content.includes('proses bisnis internal')) currentPerspective = 'internal';
            else if (content.includes('pembelajaran')) currentPerspective = 'learning';
          } else if (msg.role === 'user' && currentPerspective) {
            answersMap[currentPerspective].push(msg.content);
          }
        }
      });
      
      const objectivesText = input.companyObjectives.map(o => `- Tujuan: ${o.objectiveName} (Perspektif: ${o.bscPerspective})`).join('\n');
      const answersText = {
        financial: answersMap.financial.join('. '),
        customer: answersMap.customer.join('. '),
        internal: answersMap.internal.join('. '),
        learning: answersMap.learning.join('. '),
      };

      const designInput = {
          context: input.context,
          objectivesText,
          answersText,
          businessType: answersMap.financial.find(a => a.toLowerCase().includes('industri')) || 'N/A'
      };

    const result = await ai.generate({
      model: 'googleai/gemini-3-flash-preview',
      prompt: `Anda adalah seorang konsultan KPI ahli dengan spesialisasi dalam kerangka Balanced Scorecard (BSC). Tugas Anda adalah menghasilkan saran Key Performance Indicator (KPI) yang sangat relevan dan dapat ditindaklanjuti berdasarkan wawancara strategis dengan pengguna.

**LANGKAH 1: PAHAMI KONTEKS**
Analisis informasi dasar berikut untuk memahami peran dan lingkup tanggung jawab:
- **Jabatan:** {{{context.jobTitle}}}
- **Departemen:** {{{context.department}}}
- **Tipe Bisnis:** {{{businessType}}}
- **Level Jabatan:** {{{context.jobLevel}}}

**LANGKAH 2: HUBUNGKAN DENGAN TUJUAN STRATEGIS PERUSAHAAN**
Berikut adalah tujuan utama perusahaan yang harus menjadi acuan. Pastikan KPI yang Anda sarankan selaras dengan tujuan-tujuan ini:
{{{objectivesText}}}

**LANGKAH 3: ANALISIS HASIL WAWANCARA STRATEGIS (BSC)**
Ini adalah bagian terpenting. Analisis jawaban pengguna untuk setiap perspektif BSC untuk memahami fokus dan prioritas mereka:

- **PERSPEKTIF KEUANGAN:**
  *   **Jawaban Pengguna:** "{{answersText.financial}}"
  *   **Analisis Anda:** Terjemahkan jawaban ini menjadi KPI yang berorientasi pada hasil keuangan seperti efisiensi biaya, peningkatan pendapatan, atau profitabilitas yang relevan dengan peran {{{context.jobTitle}}}.

- **PERSPEKTIF PELANGGAN & PASAR:**
  *   **Jawaban Pengguna:** "{{answersText.customer}}"
  *   **Analisis Anda:** Hasilkan KPI yang mengukur dampak pada pelanggan, seperti kepuasan pelanggan, retensi, pangsa pasar, atau akuisisi pelanggan.

- **PERSPEKTIF PROSES BISNIS INTERNAL:**
  *   **Jawaban Pengguna:** "{{answersText.internal}}"
  *   **Analisis Anda:** Buat KPI yang berfokus pada peningkatan efisiensi, kualitas, dan inovasi dalam proses kerja sehari-hari yang relevan dengan {{{context.jobTitle}}}.

- **PERSPEKTIF PEMBELAJARAN & PERTUMBUHAN:**
  *   **Jawaban Pengguna:** "{{answersText.learning}}"
  *   **Analisis Anda:** Sarankan KPI yang mendorong pengembangan diri, kompetensi tim, dan inovasi, seperti penyelesaian pelatihan, sertifikasi, atau implementasi ide baru.

**LANGKAH 4: HASILKAN SARAN KPI (OUTPUT)**
Berdasarkan semua analisis di atas, buat daftar 5-8 saran KPI yang konkret dan SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Untuk setiap KPI:
1.  **indicator:** Nama KPI yang jelas.
2.  **category:** Tentukan kategori BSC yang paling sesuai.
3.  **measurement:** Jelaskan cara mengukurnya secara praktis.
4.  **target:** Berikan angka target yang masuk akal untuk satu siklus (misal, per tahun atau per kuartal).
5.  **targetFormat:** Tentukan 'Numerik' atau 'Persentase'.
6.  **unit:** Tentukan satuan yang jelas (contoh: "Rupiah", "%", "Jam", "Laporan").
7.  **cycle:** Tentukan siklus penilaian yang paling logis ('Bulanan', '3 Bulan', '6 Bulan', '1 Tahun').
8.  **reasoning:** Berikan 1 kalimat alasan singkat mengapa KPI ini penting berdasarkan input pengguna.

Pastikan hasilnya terstruktur sesuai dengan skema output JSON yang diminta. Jangan mengulang KPI yang sama. Variasikan antar perspektif.`,
      input: designInput,
      output: { schema: DesignPhaseOutputSchema },
      config: { temperature: 0.5 }
    });
    
    return { ...(result.output!), phase: "DESIGN" };
  }

  // Fallback if phase is incorrect
  throw new Error(`Invalid wizard phase: ${(input as any).phase}`);
}
