import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    default: "Pasta — Flashcards that stick",
    template: "%s | Pasta",
  },
  description:
    "Build decks, study with focus, and share what you learn. Pasta is a calm home for your flashcards.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col font-sans text-stone-900 dark:text-stone-100">
      <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-950/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-50"
          >
            Pasta
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-stone-600 dark:text-stone-400">
            <Link href="/#features" className="transition hover:text-amber-800 dark:hover:text-amber-300">
              Features
            </Link>
            <Link
              href="/pricing"
              className="transition hover:text-amber-800 dark:hover:text-amber-300"
            >
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-amber-700 px-4 py-2 text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              Open app
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10 text-sm text-stone-500 dark:text-stone-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Pasta. Al dente learning.</p>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-stone-800 dark:hover:text-stone-200">
              Pricing
            </Link>
            <Link href="/dashboard" className="hover:text-stone-800 dark:hover:text-stone-200">
              App
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
