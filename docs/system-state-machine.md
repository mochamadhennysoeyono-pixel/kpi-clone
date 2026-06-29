# Sistem State Machine Kalender Terintegrasi

Dokumen ini mendefinisikan arsitektur state machine yang mengontrol perilaku seluruh modul sistem berdasarkan event yang dipicu oleh Kalender. Kalender adalah **single source of truth** untuk waktu dan fase.

## Prinsip Utama

1.  **State Digerakkan oleh Event**: Perubahan status pada modul **hanya dan secara eksklusif** dipicu oleh event dari Kalender. Tidak ada transisi yang didasarkan pada aksi pengguna atau logika internal modul.
2.  **Independen dari Peran & UI**: State machine ini beroperasi di bawah lapisan peran (role) dan UI. Ia menentukan *apa* yang mungkin dilakukan, sementara peran menentukan *siapa* yang boleh melakukannya.
3.  **Deterministik**: Alur transisi status bersifat tetap dan tidak ambigu untuk memastikan perilaku sistem yang prediktif.

## Definisi Status Universal

Setiap modul yang terpengaruh oleh waktu akan selalu berada dalam salah satu dari empat status berikut:

| Status | Makna |
| :--- | :--- |
| `DISABLE`| Modul/fitur tidak aktif atau tidak relevan dalam fase saat ini. Akses penuh ditolak. |
| `ENABLE`| Modul dalam kondisi operasional penuh. Aksi diizinkan (dibatasi oleh peran).|
| `READ_ONLY`| Modul dalam mode "lihat saja". Data dapat diakses tetapi tidak dapat diubah. |
| `LOCK`| Fase telah berakhir dan terkunci permanen dalam satu siklus. Tidak dapat kembali ke `ENABLE` atau `READ_ONLY`. |

## Aturan Transisi Global

Transisi antar status diatur secara ketat untuk menjaga integritas siklus.

#### Transisi yang Diizinkan:
- `DISABLE` → `ENABLE`
- `ENABLE` → `READ_ONLY`
- `ENABLE` → `LOCK`
- `READ_ONLY` → `LOCK`

#### Transisi yang Dilarang (Ilegal):
- `LOCK` → `ENABLE` (Reset hanya bisa melalui event siklus baru yang mengembalikan state ke `DISABLE` terlebih dahulu)
- `LOCK` → `READ_ONLY`
- `READ_ONLY` → `ENABLE`
- `DISABLE` → `READ_ONLY`
- `DISABLE` → `LOCK`

---

## State Machine per Modul

Berikut adalah pemetaan event kalender ke transisi status untuk setiap modul utama.

### 1. Modul KPI
- **State Awal**: `DISABLE`
- **Transisi**:
  - **Event: `Periode Input KPI Dimulai`** → `DISABLE` ke `ENABLE`
  - **Event: `Periode Review KPI`** → `ENABLE` ke `READ_ONLY`
  - **Event: `Deadline KPI Terlewati`** → `ENABLE` ke `LOCK` (jika review tidak ada) atau `READ_ONLY` ke `LOCK`
  - **Event: `Siklus Baru Dimulai`** → `LOCK` ke `DISABLE` (Reset)

### 2. Modul KPI Review / Appraisal
- **State Awal**: `DISABLE`
- **Transisi**:
  - **Event: `Periode Review Dimulai`** → `DISABLE` ke `ENABLE`
  - **Event: `Review Selesai`** → `ENABLE` ke `LOCK`

### 3. Modul OKR
- **State Awal**: `DISABLE`
- **Transisi**:
  - **Event: `Siklus OKR Dimulai`** → `DISABLE` ke `ENABLE`
  - **Event: `Mid-Cycle Review OKR`** → `ENABLE` ke `READ_ONLY`
  - **Event: `Siklus OKR Ditutup`** → `ENABLE` atau `READ_ONLY` ke `LOCK`

### 4. Modul KBO
- **State Awal**: `DISABLE`
- **Transisi**:
  - **Event: `Observasi Perilaku Dimulai`** → `DISABLE` ke `ENABLE`
  - **Event: `Observasi Ditutup`** → `ENABLE` ke `LOCK`

### 5. Modul LMS — Course
- **State Awal**: `DISABLE`
- **Transisi**:
  - **Event: `Program Learning Dimulai`** → `DISABLE` ke `ENABLE`
  - **Event: `Program Learning Berjalan`** → `ENABLE` ke `READ_ONLY` (materi bisa dilihat, quiz dikontrol modul terpisah)
  - **Event: `Program Learning Selesai`** → `ENABLE` atau `READ_ONLY` ke `LOCK`

### 6. Modul LMS — Quiz
- **State Awal**: `DISABLE`
- **Transisi**:
  - **Event: `Pre-Test Dibuka`** → `DISABLE` ke `ENABLE`
  - **Event: `Pre-Test Selesai`** → `ENABLE` ke `LOCK`
  - **Event: `Post-Test Dibuka`** → `DISABLE` ke `ENABLE`
  - **Event: `Post-Test Selesai`** → `ENABLE` ke `LOCK`

### 7. Modul Dashboard / Summary
- **State Awal**: `ENABLE`
- **Transisi**:
  - **Event: `Perubahan Status Modul Apapun`** → Status `ENABLE` dipertahankan, namun data yang ditampilkan diperbarui.
  - **Event: `Siklus Tahunan Ditutup`** → `ENABLE` ke `READ_ONLY` (menampilkan data final yang tidak lagi berubah).
