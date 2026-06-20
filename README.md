# CARLI — Landing Page

The crypto OSINT intelligence agent. Reads X accounts, wallets, and pump.fun
projects by chaining real tool calls and letting Claude reason over the results.

Repo ini berisi **landing page** (frontend ~85% jadi). Backend, wiring data live,
dan polish akhir dibahas lengkap di `DEV_BRIEF.md` — termasuk daftar senjata
open source yang sudah dikurasi (bagian §12).

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- motion/react (animasi)
- Montserrat via `next/font/google`

## Jalankan

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

> Catatan: `next/font/google` menarik Montserrat saat build, jadi build pertama
> butuh akses ke fonts.googleapis.com.

## Struktur

```
app/
  layout.tsx      # font, metadata, viewport
  page.tsx        # komposisi section
  globals.css     # token, utility, reduced-motion
components/
  Navbar, Hero, Manifesto, Problems,
  Capabilities, Method, Closing, Footer
  Reveal.tsx      # fade-up saat scroll (reusable)
  WordReveal.tsx  # headline kata-per-kata
  Mark.tsx        # glyph logo
DEV_BRIEF.md      # brief lengkap untuk dev backend + senjata open source
```

## Brand token

| Token        | Hex       | Penggunaan                  |
|--------------|-----------|-----------------------------|
| `bg`         | `#ECEBE6` | background off-white hangat  |
| `surface`    | `#E3E1D9` | surface sekunder            |
| `ink`        | `#2B2B2E` | teks + struktur charcoal    |
| `gold`       | `#A07E4A` | aksen (dipakai hemat)       |
| `ink-soft`   | `#54524F` | teks body redup             |
| `line`       | `#D4D1C8` | border tipis                |

Typeface: Montserrat (400–900).
