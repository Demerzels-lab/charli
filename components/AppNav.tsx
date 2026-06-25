'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Agent', href: '/agent' },
  { label: 'Wallet', href: '/wallet' },
  { label: 'Project', href: '/project' },
  { label: 'X Account', href: '/x-account' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-nav border-b border-line bg-bg/90 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.18em] text-ink"
          aria-label="CARLI — back to home"
        >
          <Image src="/logo.png" alt="" width={20} height={20} className="rounded-full" />
          Carli
        </Link>

        <div className="flex items-center gap-1">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-sm px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                  active
                    ? 'bg-ink text-bg'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
