import Image from "next/image";

const COLS = [
  {
    title: "Intelligence",
    links: [
      { label: "X Account Intel", href: "#capabilities" },
      { label: "Wallet Dossier", href: "#capabilities" },
      { label: "Project Report", href: "#capabilities" },
      { label: "Agent Mode", href: "#capabilities" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "The premise", href: "#problem" },
      { label: "How it works", href: "#method" },
      { label: "$CARLI", href: "#token" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="shell py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="" width={24} height={24} className="rounded-full" />
              <span className="text-sm font-extrabold uppercase tracking-[0.18em]">
                Carli
              </span>
            </div>
            <p className="mt-4 max-w-xs text-pretty text-sm leading-relaxed text-ink-soft">
              On-chain plus social intelligence, read by Claude. For due
              diligence on public data. Not a surveillance tool.
            </p>
          </div>

          {COLS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="eyebrow mb-4">{col.title}</p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-ink-soft transition-colors hover:text-ink"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-soft md:flex-row md:items-center md:justify-between">
          <p className="uppercase tracking-wider">
            CARLI · The crypto OSINT agent · Powered by Claude
          </p>
          <p>For research on public data only. DYOR.</p>
        </div>
      </div>
    </footer>
  );
}
