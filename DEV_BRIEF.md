# CARLI — Dev Brief

Dokumen ini menyerahkan frontend CARLI (landing page, sekitar 85% jadi) dan
menjabarkan backend + wiring data yang dibutuhkan supaya setiap fitur **berfungsi
penuh end to end**. Caesar pegang produk, copy, dan arah visual. Kamu pegang
backend, data live, dan integrasi akhir.

Bagian akhir (§12 ke bawah) berisi senjata open source yang sudah dikurasi dan
diverifikasi — repo yang bisa langsung kamu fork/pakai untuk backend, lengkap
dengan pemetaan ke tiap fitur.

---

## 0. Ringkas buat dev

- Landing page dibangun dengan **Next.js 14 (App Router) + TypeScript + Tailwind + motion/react**. Sudah jalan apa adanya.
- Tugas kamu: bangun **4 fitur investigasi** di belakangnya, masing-masing didukung data publik nyata, dengan **Claude sebagai lapisan reasoning**.
- Arsitektur: **Next.js frontend → FastAPI backend → (public data API + Claude API)**. Redis untuk caching + rate limiting.
- Aturan keras: **hanya data publik**. Tidak ada breach corpus, tidak ada scraping privat, tidak ada sumber di balik login.
- Kabar baik: **ekosistem MCP kukapay sudah menutup ~70% kebutuhan data backend** — termasuk dependency tersulit (riwayat username Twitter). Semua repo kukapay Python + MIT. Detail di §12.

---

## 1. Yang sudah dibangun (frontend)

```
app/
  layout.tsx        Montserrat (next/font), metadata, viewport/themeColor
  page.tsx          komposisi section
  globals.css       design token, utility, prefers-reduced-motion
components/
  Navbar.tsx        nav sticky, blur saat scroll, mobile menu accessible
  Hero.tsx          headline kata-per-kata, stat bar, CTA
  Manifesto.tsx     strip premis editorial
  Problems.tsx      4 problem sebagai baris editorial besar, fade-up saat scroll
  Capabilities.tsx  4 fitur inti (gaya intelligence-table)
  Method.tsx        pipeline teknis: bagaimana Claude menjalankan recon
  Closing.tsx       token strip + CTA penutup (tombol copy CA)
  Footer.tsx
  Reveal.tsx        fade-up saat scroll (reusable)
  WordReveal.tsx    reveal headline kata-per-kata
  Mark.tsx          glyph logo (SVG)
```

Brand token ada di `tailwind.config.ts`:

| Token      | Hex       | Penggunaan                  |
|------------|-----------|-----------------------------|
| `bg`       | `#ECEBE6` | background off-white hangat  |
| `surface`  | `#E3E1D9` | surface sekunder            |
| `ink`      | `#2B2B2E` | teks + struktur charcoal    |
| `gold`     | `#A07E4A` | aksen (dipakai hemat)       |
| `ink-soft` | `#54524F` | teks body redup             |
| `line`     | `#D4D1C8` | border tipis                |

Typeface: **Montserrat** (weight 400–900).

### Konvensi frontend yang harus dijaga
- Animasi hanya `transform` + `opacity`. Jangan animasikan properti layout.
- Hormati `prefers-reduced-motion` (sudah diwire di `globals.css` + komponen).
- Satu aksen (gold) per view. Tanpa gradient, tanpa glow sebagai affordance utama.
- `tabular-nums` untuk semua angka, `text-balance` untuk heading, `text-pretty` untuk body.

---

## 2. Arsitektur target

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (Vercel)                                            │
│   • Landing page (selesai)                                  │
│   • /app  → UI investigasi (4 fitur + agent chat)           │
│   • Panggil backend via route proxy /api (sembunyikan key)  │
└───────────────┬─────────────────────────────────────────────┘
                │ HTTPS (JSON)
┌───────────────▼─────────────────────────────────────────────┐
│  FastAPI (Railway)                                          │
│   • /investigate/x-account                                  │
│   • /investigate/wallet                                     │
│   • /investigate/project                                    │
│   • /agent/chat        (SSE stream)                         │
│                                                             │
│   Pipeline per request:                                     │
│   1. validasi + klasifikasi input                           │
│   2. fan-out ke sumber data publik (async)                  │
│   3. normalisasi jadi objek evidence                        │
│   4. Claude tool_use / messages → verdict yang dianalisis   │
│   5. cache (Redis) + balikan JSON terstruktur               │
└──────┬───────────────────────┬──────────────────────────────┘
       │                       │
┌──────▼─────────┐    ┌────────▼──────────────────────────────┐
│ Redis          │    │ Data eksternal (semua publik)         │
│ • cache (24j)  │    │ • Solscan / Helius   (Solana)         │
│ • rate limit   │    │ • Etherscan          (EVM)            │
│ • memori agent │    │ • crt.sh + WHOIS     (domain)         │
└────────────────┘    │ • Data X/Twitter     (lihat §6)       │
                      │ • Anthropic Claude   (reasoning)      │
                      └───────────────────────────────────────┘
```

**Kenapa FastAPI dipisah dari Next.js:** fan-out data bersifat async dan Python
punya SDK paling bersih untuk API chain ini. Sekaligus menjaga key Claude + key
data sepenuhnya jauh dari client. Kalau kamu lebih suka menggabungkan ini ke
route handler Next.js + Vercel functions, boleh — kontrak di §4 tetap sama.

---

## 3. Lapisan reasoning (Claude)

Setiap fitur diakhiri dengan Claude mengubah evidence mentah jadi **verdict**.
Pakai Anthropic Messages API dengan **tool_use** supaya Claude menarik data live
di tengah giliran, bukan menalar di atas blob basi.

- Model: `claude-sonnet-4-6` (string sesuai dokumentasi produk terkini — konfirmasi saat build).
- Tiap fitur menyuntik **system prompt** yang mendefinisikan persona CARLI + skema output (lihat §5 dan `CARLI_SYSTEM_PROMPT.md` begitu ditulis).
- Output harus **JSON terstruktur** yang dirender frontend. Minta Claude balikan JSON saja (tanpa prosa, tanpa pagar markdown), lalu parse secara defensif.

### Model confidence (pakai di mana-mana)
Setiap temuan punya grade:
- `TENTATIVE` — sinyal lemah/tunggal
- `FIRM` — beberapa sinyal yang saling menguatkan
- `CONFIRMED` — bukti langsung on-chain/registrasi

### Level verdict (per fitur, lihat §5)
- Akun: `LEGIT` · `DYOR` · `RED_FLAG`
- Project: `SAFE` · `DYOR` · `HIGH_RISK` · `LIKELY_RUG`
- Wallet: `CLEAN` · `WATCH` · `FLAGGED`

---

## 4. Kontrak API

Semua endpoint mengembalikan envelope ini:

```ts
type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta: { cached: boolean; tookMs: number; ratelimit: { remaining: number; resetAt: string } };
};
```

### 4.1 `POST /investigate/x-account`
```ts
// request
{ handle: string }              // "@nama" atau "nama"

// data.verdict
{
  handle: string;
  level: "LEGIT" | "DYOR" | "RED_FLAG";
  confidence: "TENTATIVE" | "FIRM" | "CONFIRMED";
  summary: string;              // 1–2 kalimat, suara CARLI
  signals: Array<{
    label: string;              // "Umur akun vs pertumbuhan follower"
    value: string;              // temuan dalam bahasa manusia
    weight: "low" | "med" | "high";
    direction: "ok" | "warn" | "bad";
  }>;
  metrics: {
    accountAgeDays: number | null;
    followers: number | null;
    following: number | null;
    usernameChanges: number | null;        // sinyal kunci — lihat Problem 01
    firstCryptoMentionDays: number | null; // null = tidak pernah menyebut crypto
  };
  redFlags: string[];
}
```

### 4.2 `POST /investigate/wallet`
```ts
// request
{ address: string; chain?: "solana" | "evm" }   // deteksi otomatis kalau kosong

// data.verdict
{
  address: string;
  chain: "solana" | "evm";
  level: "CLEAN" | "WATCH" | "FLAGGED";
  confidence: "TENTATIVE" | "FIRM" | "CONFIRMED";
  classification: "dev" | "whale" | "flipper" | "fresh" | "mixed";
  summary: string;
  balanceUsd: number | null;
  firstSeen: string | null;     // ISO
  lastActive: string | null;    // ISO
  linkedProjects: Array<{ name: string; role: string; note: string }>;
  signals: Array<{ label: string; value: string; direction: "ok" | "warn" | "bad" }>;
}
```

### 4.3 `POST /investigate/project`
```ts
// request
{ query: string }   // nama | contract address | domain — klasifikasi di server

// data.verdict
{
  query: string;
  resolvedAs: "contract" | "domain" | "name";
  level: "SAFE" | "DYOR" | "HIGH_RISK" | "LIKELY_RUG";
  confidence: "TENTATIVE" | "FIRM" | "CONFIRMED";
  riskScore: number;            // 0–100
  summary: string;
  domain?: { ageDays: number | null; registrar: string | null; createdAt: string | null };
  socials?: { x?: string; telegram?: string; site?: string };
  wallets?: Array<{ address: string; role: "deployer" | "funder" | "linked"; note: string }>;
  narrativeFlags: string[];     // Problem 03 — kecocokan dengan playbook manipulasi
  findings: Array<{ label: string; detail: string; direction: "ok" | "warn" | "bad"; confidence: string }>;
}
```

### 4.4 `POST /agent/chat` (SSE stream)
```ts
// request
{ messages: Array<{ role: "user" | "assistant"; content: string }>; sessionId?: string }

// streaming Server-Sent Events:
//   event: token   data: { text }
//   event: tool    data: { name, status }   // mis. {name:"lookup_wallet", status:"running"}
//   event: verdict data: { ...terstruktur }  // kartu terstruktur opsional di akhir
//   event: done    data: {}
```
Agent mode memakai ulang tiga tool investigasi sebagai **tools** Claude, jadi
satu giliran chat bisa menembak `lookup_wallet` → `lookup_x_account` → sintesis.

---

## 5. Cara tiap fitur harus bekerja (kriteria penerimaan)

> "BERFUNGSI" = data nyata masuk, verdict terstruktur keluar, dirender di UI,
> ter-cache, ter-rate-limit, dan tahan banting saat gagal.

### Fitur 1 — X Account Intel
- [ ] Resolusi handle → profil lewat jalur data X di §6.
- [ ] Hitung: umur akun, follower/following, **riwayat ganti username**, **penyebutan crypto pertama** (null kalau tidak pernah).
- [ ] Claude menimbang sinyal → `LEGIT | DYOR | RED_FLAG` + confidence.
- [ ] Secara spesifik menangkap Problem 01 (fake engagement) dan Problem 02 (akun dibajak tanpa riwayat crypto).
- [ ] Dirender sebagai kartu verdict dengan baris sinyal + ekspor shareable.

### Fitur 2 — Wallet Dossier
- [ ] Deteksi otomatis Solana vs EVM dari format alamat.
- [ ] Tarik balance, aktivitas pertama/terakhir, perilaku tx, sumber pendanaan.
- [ ] Klasifikasi dev/whale/flipper/fresh.
- [ ] Claude → `CLEAN | WATCH | FLAGGED` + project terkait.
- [ ] Jangan pernah berhenti di sumber lambat — hasil parsial dengan catatan masih oke.

### Fitur 3 — Project OSINT Report
- [ ] Klasifikasi input sebagai contract / domain / name.
- [ ] Domain: umur + registrar (WHOIS), riwayat sertifikat (crt.sh).
- [ ] Resolusi social terkait + wallet deployer/funder.
- [ ] **Analisis narasi (Problem 03):** Claude membaca copy project itu sendiri + bahasa akun yang nge-shill terhadap checklist playbook manipulasi, lalu mengeluarkan `narrativeFlags`.
- [ ] Skor 0–100 → `SAFE | DYOR | HIGH_RISK | LIKELY_RUG`.
- [ ] Output dirancang bisa diekspor jadi "CARLI Report card" untuk X (loop viralitas).

### Fitur 4 — Agent Mode
- [ ] Chat bebas; Claude memutuskan tool mana yang dipanggil.
- [ ] Stream token + event status tool (UI menampilkan "membaca chain…").
- [ ] Kartu verdict terstruktur opsional disisipkan di akhir giliran.
- [ ] Memori sesi di Redis dengan key `sessionId` (efemeral, TTL mis. 1 jam).

---

## 6. Soal data X/Twitter (baca ini)

Data X adalah **dependency paling berisiko** — API resmi mahal dan terbatas, dan
ToS penting. Putuskan dengan sadar:

1. **API X resmi (disarankan untuk kepatuhan):** tier Basic/Pro. Memberi profil,
   created_at, public metrics. **Tidak** memberi riwayat ganti username langsung —
   pakai sumber enrichment pihak ketiga atau inferensi (lihat §12.1 — kukapay
   punya tool khusus untuk ini).
2. **Penyedia intelligence pihak ketiga:** beberapa menjual data riwayat akun +
   ganti username. Paling bersih untuk Problem 01, tapi periksa ToS + biaya.
3. **Hybrid:** API resmi untuk metrik live + penyedia untuk sinyal riwayat.

Apa pun pilihannya, **degradasi yang anggun**: kalau satu sinyal (mis. riwayat
username) tidak tersedia, balikan sebagai `null` dan biarkan Claude menurunkan
confidence, bukan menggagalkan seluruh request. **Jangan** scraping X yang
ter-login.

> **Catatan penting (lihat §12.5):** Twint dan semua tool yang dibangun di atasnya
> sudah praktis mati sejak X mengunci API-nya. Jangan bangun di atas Twint.

---

## 7. Caching, rate limiting, kontrol biaya

- **Cache (Redis, 24j):** key berdasarkan input ternormalisasi (`x:@handle`,
  `wallet:addr`, `project:query`). Mayoritas lookup berulang seharusnya tidak
  pernah menyentuh Claude atau API berbayar.
- **Rate limit:** per IP, mis. 5 investigasi/hari (sesuai copy landing). Balikan
  remaining/resetAt di `meta.ratelimit`. Tampilkan di UI.
- **Biaya Claude:** cache agresif; jaga system prompt tetap ringkas; stream hanya
  di agent mode. Pertimbangkan model lebih murah untuk klasifikasi input, Sonnet
  untuk verdict.
- **Fan-out:** jalankan sumber data secara konkuren (`asyncio.gather`) dengan
  timeout per sumber supaya satu API lambat tidak menahan respons.

---

## 8. Keamanan & etika (tidak bisa ditawar)

- Hanya data publik. Tidak ada breach dump, tidak ada scraping privat/login-walled.
- Key hidup di server. Frontend tidak pernah melihat key data atau key Claude.
- Sertakan **ToS + disclaimer** yang jelas: CARLI adalah alat riset due-diligence
  atas informasi publik, bukan surveillance, bukan nasihat finansial. DYOR.
- Sanitasi semua input user sebelum mencapai sumber data atau prompt.
- Jangan menyimpan data pribadi melebihi TTL cache yang efemeral.

---

## 9. Env vars

```
# Claude
ANTHROPIC_API_KEY=

# Data chain
SOLSCAN_API_KEY=          # atau HELIUS_API_KEY
ETHERSCAN_API_KEY=
DUNE_API_KEY=             # dipakai banyak tool kukapay (lihat §12)

# Data X (jalur mana pun dari §6)
X_BEARER_TOKEN=
X_ENRICHMENT_API_KEY=     # opsional, untuk sinyal riwayat

# Opsional (tergantung tool yang dipakai dari §12)
SOLSNIFFER_API_KEY=       # rug-check-mcp
WHALE_ALERT_API_KEY=      # whale-tracker-mcp

# Infra
REDIS_URL=
NEXT_PUBLIC_API_BASE=     # frontend → base URL backend
```

---

## 10. Urutan build yang disarankan

1. Skeleton backend + `/investigate/wallet` (data paling bersih, sepenuhnya publik) → buktikan pipeline end to end. Pakai `pumpfun-wallets-mcp` + `wallet-inspector-mcp` dari kukapay (§12) — modal cuma Dune key gratis, jalan di hari pertama.
2. `/investigate/project` (tambah domain + analisis narasi).
3. `/investigate/x-account` (resolusi jalur data X dulu — ini tiang terpanjang).
4. `/agent/chat` (memakai ulang tiga di atas sebagai tools).
5. Wire tiap fitur ke UI `/app`; tambah ekspor report-card untuk share di X.
6. Caching + rate limiting + pass tahan-gagal.
7. ToS/disclaimer + launch.

---

## 11. Item terbuka untuk Caesar (product owner)

- [ ] Domain final: gaya `ctrace.xyz` atau domain CARLI baru.
- [ ] Keputusan jalur data X (§6) — memengaruhi biaya + sinyal yang mungkin.
- [ ] `CARLI_SYSTEM_PROMPT.md` — persona + skema output per fitur (deliverable berikutnya).
- [ ] Contract address $CARLI (masuk ke `Closing.tsx`, sekarang masih placeholder).
- [ ] Spec visual report-card untuk gambar share di X.

---
---

# 12. Senjata Open Source (riset terkurasi)

Repo open source yang sudah diverifikasi dan dipetakan langsung ke fitur CARLI.
Tiap entri mencatat fungsinya, lisensinya, dan fitur/Problem mana yang dilayani.

> **Temuan utama:** ekosistem MCP **kukapay** menutup ~70% kebutuhan data backend
> CARLI di luar kotak — termasuk dependency paling sulit (riwayat username
> Twitter). Semua repo kukapay **Python, lisensi MIT**, jadi bebas di-fork,
> dimodifikasi, dan dikomersialkan tanpa ikatan.

## 12.0 Cara membaca bagian ini

Setiap repo ditandai:
- **Lisensi** — MIT/Apache = aman dipakai komersial dan dimodifikasi. (Verifikasi sebelum ship.)
- **Bentuk** — MCP server (tool native Claude), library/SDK, atau kode referensi.
- **Melayani** — fitur CARLI atau Problem (01–04) mana yang ditangani.
- **Perhatian** — hal yang dev harus tahu sebelum mengandalkannya.

Soal **MCP server vs API sendiri:** tool kukapay ditulis sebagai MCP server
(dirancang nyolok ke Claude Desktop). Untuk CARLI ada dua opsi bersih, dua-duanya valid:
1. **Bungkus jadi tools di agent.** Claude tool_use bisa memanggilnya langsung —
   fungsi tool MCP itu jadi instrumen CARLI. Jalur tercepat.
2. **Angkat logika datanya.** Tiap repo adalah file Python kecil yang memukul API
   publik (Dune, Whale Alert, dll). Dev bisa menyalin logika request/parse-nya
   langsung ke backend FastAPI dan melewati lapisan MCP sepenuhnya.

Apa pun jalurnya, nilainya ada di **kode fetch + parse data yang sudah jadi**.

---

## 12.1 Ekosistem kukapay (rekomendasi utama)

Index monorepo: `github.com/kukapay/kukapay-mcp-servers` — suite MCP server crypto/
Web3, semua Python + MIT. Yang relevan untuk CARLI:

### `twitter-username-changes-mcp` ⭐ NILAI TERTINGGI
- **github.com/kukapay/twitter-username-changes-mcp**
- **Melayani:** Fitur 1 (X Account Intel) · **Problem 01 & 02**
- **Apa:** Melacak seluruh riwayat ganti username akun X mana pun. Tool:
  `query_username_changes(screen_name)`. Mengembalikan tiap handle lama dengan rentang tanggal.
- **Kenapa penting:** Ini persis sinyal di hero CARLI ("16 username changes pada
  satu akun scam"). Data tersulit didapat dan paling memberatkan untuk akun palsu/
  daur ulang. Contoh output asli dari repo:
  ```
  User ID 4725638310:
   - The_HelpfulHand (2016-01-09 to 2020-09-27)
   - nftpromo_s      (2022-02-10 to 2022-02-23)
   - OSINT_Ukraine   (2022-02-24 to 2022-02-25)
  ```
  Akun yang dulu bernama "nftpromo_s" sebelum jadi akun "news" adalah cerita yang
  bisa CARLI ungkap seketika.
- **Lisensi:** MIT · **Bentuk:** MCP server (Python)
- **Perhatian:** Bergantung pada sumber riwayat pihak ketiga — konfirmasi sumber
  data + rate limit-nya sebelum diandalkan di produksi.

### `pumpfun-wallets-mcp` ⭐
- **github.com/kukapay/pumpfun-wallets-mcp**
- **Melayani:** Fitur 2 (Wallet Dossier) · Fitur 3 (Project Report)
- **Apa:** Menganalisis aktivitas trading + profitabilitas wallet di Pump.fun dan
  PumpSwap. Wallet paling profit, wallet trading teratas, **distribusi wallet per
  tier tanpa bot**, timestamp tx terakhir.
- **Kenapa penting:** Langsung menggerakkan klasifikasi dev/whale/flipper di Wallet
  Dossier, dan cek "apakah deployer ini insider profit yang dikenal" di Project Report.
- **Lisensi:** MIT · **Bentuk:** MCP server (Python) · **Data:** Dune Analytics API (key gratis)

### `memecoin-radar-mcp` ⭐
- **github.com/kukapay/memecoin-radar-mcp**
- **Melayani:** Fitur 3 (Project Report) · surface "trending" ke depan
- **Apa:** Radar real-time memecoin Solana, graduate Pump.fun, dan **trade KOL**.
  Token trending per sumber (Telegram/Web/Mobile), pembelian KOL, tren volume
  Raydium/PumpSwap.
- **Kenapa penting:** Membuat CARLI bisa menjawab "apakah token ini didorong KOL
  yang sama yang biasa pump-and-dump" dan "apakah hype-nya nyata atau dibuat-buat".
  Juga basis kuat kalau nanti bikin feed discovery live.
- **Lisensi:** MIT · **Bentuk:** MCP server (Python) · **Data:** Dune Analytics API

### `wallet-inspector-mcp`
- **github.com/kukapay** (di monorepo)
- **Melayani:** Fitur 2 (Wallet Dossier)
- **Apa:** Memeriksa balance wallet dan aktivitas on-chain lintas chain.
- **Kenapa penting:** Pembacaan balance/aktivitas umum untuk dossier, melengkapi
  data spesifik Pump.fun di atas.
- **Lisensi:** MIT · **Bentuk:** MCP server (Python)

### `rug-check-mcp`
- **github.com/kukapay/rug-check-mcp**
- **Melayani:** Fitur 3 (Project Report) — skoring risiko
- **Apa:** Mendeteksi risiko token meme Solana via Solsniffer API. Mengembalikan
  Snif score, risiko mint/freeze authority, konsentrasi holder, status audit.
- **Kenapa penting:** Lapisan sinyal risiko siap pakai untuk diumpankan ke verdict
  SAFE/DYOR/HIGH_RISK/LIKELY_RUG.
- **Lisensi:** MIT · **Bentuk:** MCP server (Python) · **Data:** key Solsniffer API

### `whale-tracker-mcp`
- **github.com/kukapay/whale-tracker-mcp**
- **Melayani:** Fitur 2 (Wallet Dossier) — konteks pendanaan/aliran dana
- **Apa:** Melacak transaksi besar via Whale Alert API. Tx terbaru dengan filter,
  lookup detail transaksi.
- **Lisensi:** MIT · **Bentuk:** MCP server (Python) · **Data:** key Whale Alert API

### `honeypot-detector-mcp`
- **github.com/kukapay** (di monorepo)
- **Melayani:** Fitur 3 (Project Report) — sisi EVM
- **Apa:** Mendeteksi token honeypot di Ethereum, BSC, dan Base.
- **Kenapa penting:** Kalau CARLI melebar ke project EVM, ini cek honeypot-nya.
  Simpan di roadmap.
- **Lisensi:** MIT · **Bentuk:** MCP server (Python)

### `crypto-projects-mcp` & `ens-mcp`
- Masing-masing: metadata project untuk agent, dan resolusi/analisis ENS.
- **Melayani:** Fitur 3 (Project Report) — resolusi identitas.
- **Lisensi:** MIT · **Bentuk:** MCP server (Python)

---

## 12.2 Lapisan reasoning (resmi Anthropic — pakai ini)

### `anthropic-sdk-python` ⭐ WAJIB
- **github.com/anthropics/anthropic-sdk-python**
- **Melayani:** semua fitur — ini cara CARLI memanggil Claude.
- **Apa:** SDK Python resmi untuk Messages API. Tool use, streaming, output
  terstruktur semua lewat `POST /v1/messages`.
- **Lisensi:** MIT
- **Catatan:** Pakai tool runner SDK untuk penanganan agent-loop otomatis, atau
  tulis loop manual untuk approval gate / logging kustom. Sesuai panduan
  Anthropic sendiri, utamakan SDK resmi daripada raw HTTP.

### `claude-agent-sdk-python`
- **github.com/anthropics/claude-agent-sdk-python**
- **Melayani:** Fitur 4 (Agent Mode) — agent loop penuh.
- **Apa:** Mesin di balik Claude Code, sebagai library. Memberi agent loop,
  orkestrasi tool, dan manajemen konteks supaya kamu tidak membangunnya dari nol.
  Custom tool = fungsi Python biasa (in-process MCP), tanpa proses terpisah.
- **Lisensi:** MIT (SDK; pemakaian diatur Anthropic Commercial Terms)
- **Kenapa penting:** Kalau Agent Mode jadi kompleks (investigasi multi-langkah
  yang merangkai beberapa tool), ini menghemat membangun orkestrasi sendiri.

### `claude-agent-sdk-demos`
- **github.com/anthropics/claude-agent-sdk-demos**
- **Melayani:** referensi Fitur 4 + UI chat FastAPI/WebSocket.
- **Apa:** Demo resmi — termasuk UI chat React + Express via WebSocket dengan
  streaming, sistem riset multi-agent, dan pembuat resume yang men-web-search
  seseorang lalu merangkai temuan (analog dekat dengan loop "investigasi dan
  sintesis" CARLI).
- **Lisensi:** lihat repo · **Perhatian:** secara eksplisit **demo local-dev,
  bukan untuk produksi skala besar** — baca sebagai pola, jangan deploy apa adanya.

### FastMCP (kalau tetap pakai lapisan MCP)
- **`fastmcp`** (PyPI / github) — MCP server berbasis decorator di Python, rasa
  FastAPI. Berguna kalau kamu memutuskan mengekspos tool CARLI sendiri sebagai
  MCP server alih-alih meng-inline-nya.
- **Lisensi:** cek repo terkini.

---

## 12.3 Deteksi rug/risk Solana (alternatif & pelengkap)

Ini tumpang tindih dengan `rug-check-mcp` kukapay tapi menawarkan model skoring
berbeda. Bagus untuk dibandingkan dan dipinjam heuristiknya.

### `degenfrends/solana-rugchecker`
- **github.com/degenfrends/solana-rugchecker**
- **Melayani:** Fitur 3 (Project Report)
- **Apa:** Library TypeScript. Menganalisis metadata token, top holder, likuiditas
  → `rugScore` + `isRug`. Checker modular (MetadataChecker, **WebsiteChecker** yang
  melakukan WHOIS pada situs project).
- **Kenapa penting:** Pola WebsiteChecker langsung berguna untuk sinyal umur/
  registrasi domain CARLI. Bisa di-install via npm.
- **Lisensi:** cek repo · **Bentuk:** library TypeScript · **Data:** Solana RPC + Helius

### Solana Tracker Data API (+ contoh runnable)
- **solanatracker.io** — `getTokenInfo(mint)` mengembalikan objek `risk`: skor
  1–10, **sniper, bundler, wallet insider, dev holding, mint/freeze authority**
  dalam satu payload. "Data risk yang sama yang menggerakkan Rugcheck."
- **Melayani:** Fitur 3 — jalur tercepat ke skor risiko tanpa parsing akun.
- **Bentuk:** API hosted + contoh Node runnable di GitHub (tier key gratis).
- **Perhatian:** API hosted pihak ketiga — tier berbayar untuk limit lebih tinggi.
  Baca harganya sebelum bergantung.

### `machenxi/rugpull-scam-token-detection`
- **github.com/machenxi/rugpull-scam-token-detection**
- **Melayani:** Fitur 3 + fitur live-watch ke depan
- **Apa:** Bot TypeScript. Subscribe ke log Solana untuk mint/pool baru, cek
  authority, heuristik likuiditas, skor risiko 0–100 berbobot, alert Telegram/
  Discord. Layout `src/` yang jelas (config, solana client, checks, scoring).
- **Kenapa penting:** Arsitektur referensi bersih untuk "pantau launch baru dan
  skor" kalau CARLI menambah monitoring real-time. Juga referensi bobot skoring
  yang baik.
- **Lisensi:** cek repo · **Bentuk:** service TypeScript · **Data:** Solana RPC/WS

> **Catatan soal RugCheck (rugcheck.xyz):** dipakai luas, punya API, tapi
> verifikasi syarat akses terkini — banyak repo org publiknya tipis. Pinjam ide
> heuristiknya (taint propagation, common-spend clustering) dari tulisan mereka
> meski tidak memakai API-nya langsung.

---

## 12.4 OSINT domain / web

### WHOIS + cert transparency (bangun, jangan import)
- **crt.sh** (pencarian cert transparency) dan **WHOIS** standar adalah dua sumber
  data di §4 untuk umur domain. Keduanya bisa di-query langsung; `WebsiteChecker`
  di §12.3 menunjukkan pola WHOIS yang jalan dalam TS, dan `python-whois` + query
  HTTP crt.sh sederhana menutup ini dalam beberapa baris.
- **Melayani:** Fitur 3 (Project Report) — sinyal umur domain + registrasi.

---

## 12.5 Data X / Twitter — baca ini baik-baik

Ini **dependency paling berisiko** CARLI. Kondisi terkini:

- **Twint dan semua yang dibangun di atasnya** (twint, twosint, tw1tter0s1nt,
  tinfoleak) **praktis mati** — rusak saat X mengunci API/endpoint-nya dan tidak
  lagi andal. **Jangan** bangun di atas Twint. (Dicantumkan supaya dev tidak buang
  waktu menemukan ini sendiri.)
- **Yang benar-benar jalan di 2026:**
  - **API X resmi** (tier Basic/Pro) untuk profil live + public metrics +
    created_at. Berbayar, terbatas, terikat ToS. Jalur yang patuh.
  - **kukapay `twitter-username-changes-mcp`** (§12.1) untuk sinyal riwayat yang
    tidak diekspos API resmi.
  - **Penyedia enrichment pihak ketiga** kalau butuh sinyal riwayat/perilaku lebih
    dalam — periksa ToS + biaya.
- **Aturan keras (ulang dari §6):** jangan scraping X yang ter-login. Degradasi
  yang anggun — kalau sinyal tidak tersedia, balikan `null` dan biarkan Claude
  menurunkan confidence, bukan menggagalkan request.

---

## 12.6 Rakitan yang disarankan untuk CARLI

Stack awal konkret, dipetakan ke fitur:

```
Fitur 1 — X Account Intel
  • API X resmi              → profil, umur, public metrics
  • twitter-username-changes-mcp (kukapay) → riwayat handle   [Problem 01/02]
  • Claude (anthropic-sdk)   → timbang sinyal → LEGIT/DYOR/RED_FLAG

Fitur 2 — Wallet Dossier
  • pumpfun-wallets-mcp (kukapay)  → profitabilitas/perilaku pump.fun
  • wallet-inspector-mcp (kukapay) → balance/aktivitas lintas chain
  • whale-tracker-mcp (kukapay)    → konteks pendanaan/aliran
  • Claude → klasifikasi dev/whale/flipper → CLEAN/WATCH/FLAGGED

Fitur 3 — Project OSINT Report
  • rug-check-mcp (kukapay) ATAU Solana Tracker API → sinyal risiko on-chain
  • pola WebsiteChecker degenfrends → WHOIS/umur domain
  • memecoin-radar-mcp (kukapay) → konteks KOL/hype             [Problem 04]
  • Claude → analisis narasi + skor → SAFE..LIKELY_RUG          [Problem 03]

Fitur 4 — Agent Mode
  • claude-agent-sdk-python → agent loop + orkestrasi tool
  • tiga pipeline fitur di atas, diekspos sebagai tools
  • claude-agent-sdk-demos (UI chat WebSocket) → referensi UI streaming
```

**Kaitan urutan build (dari §10):** mulai dari Wallet Dossier karena
`pumpfun-wallets-mcp` + `wallet-inspector-mcp` kukapay memberi jalur data yang
jalan di hari pertama hanya dengan Dune key gratis. Ini membuktikan seluruh
pipeline (data → Claude → verdict → cache) sebelum kamu menyentuh masalah data X,
yang merupakan tiang terpanjang.

---

## 12.7 Ringkasan lisensi (verifikasi sebelum ship)

| Repo / sumber                     | Lisensi        | Aman dimodif + ship?   |
|-----------------------------------|----------------|------------------------|
| kukapay/* (semua di atas)         | MIT            | Ya                     |
| anthropic-sdk-python              | MIT            | Ya                     |
| claude-agent-sdk-python           | MIT*           | Ya (Anthropic ToS)     |
| degenfrends/solana-rugchecker     | cek repo       | Kemungkinan — konfirmasi |
| machenxi/rugpull-scam-detection   | cek repo       | Kemungkinan — konfirmasi |
| Solana Tracker API                | hosted/berbayar| Syarat API berlaku     |
| API X resmi                       | komersial      | Syarat API berlaku     |

\* SDK berlisensi MIT; pemakaian untuk menggerakkan produk diatur Anthropic Commercial Terms.

**Selalu cek ulang file LICENSE saat integrasi** — repo bisa berubah. MIT dan
Apache-2.0 jelas untuk pemakaian komersial; apa pun tanpa lisensi eksplisit
berarti "all rights reserved" secara default dan tidak boleh diasumsikan boleh dipakai.
