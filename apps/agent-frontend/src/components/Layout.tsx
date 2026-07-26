import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function Layout({ children }: Props) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="border-b border-[var(--color-border-light)] bg-[var(--color-surface)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-500)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </div>
            <span className="font-semibold text-[var(--color-text-heading)] text-lg tracking-tight">CareerCompass</span>
          </a>
          <span className="text-sm text-[var(--color-text-secondary)] hidden sm:block">AI Career Blueprint Generator</span>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-[var(--color-border-light)] py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-[var(--color-text-secondary)]">
          CareerCompass &mdash; Temukan jalur karier terbaikmu dengan data pasar kerja nyata
        </div>
      </footer>
    </div>
  );
}
