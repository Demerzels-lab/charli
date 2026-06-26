"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const LINKS = [
  { label: "Problem", href: "#problem" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Method", href: "#method" },
  { label: "Token", href: "#token" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-nav transition-colors duration-200 ${
        scrolled
          ? "border-b border-line bg-bg/85 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <nav className="shell flex h-16 items-center justify-between">
        <a
          href="#top"
          className="flex items-center gap-2.5"
          aria-label="CARLI — home"
        >
          <Image src="/logo.png" alt="CARLI" width={32} height={32} className="rounded-full" />
          <span className="text-[15px] font-extrabold uppercase tracking-[0.18em]">
            Carli
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://x.com/carliosint"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center transition-colors text-ink-soft hover:text-ink"
            aria-label="CARLI on X"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.6l-5.17-6.763-5.91 6.763h-3.308l7.727-8.835L.424 2.25h6.7l4.67 6.18 5.37-6.18zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="/agent"
            className="group inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2 text-[13px] font-semibold uppercase tracking-wider text-bg transition-colors hover:bg-transparent hover:text-ink"
          >
            Enter
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </div>

        <button
          type="button"
          className="flex size-10 items-center justify-center md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex flex-col gap-1.5">
            <span
              className={`block h-0.5 w-5 bg-ink transition-transform ${
                open ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 bg-ink transition-opacity ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 bg-ink transition-transform ${
                open ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="border-t border-line bg-bg px-6 py-4 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm font-medium text-ink-soft"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/agent"
                onClick={() => setOpen(false)}
                className="mt-2 block bg-ink px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider text-bg"
              >
                Enter CARLI
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
