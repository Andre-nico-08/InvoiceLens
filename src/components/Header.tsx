interface HeaderProps {
  onQuickUploadClick: () => void;
}

export function Header({ onQuickUploadClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
        >
          InvoiceLens
        </a>

        <nav
          aria-label="Navigazione principale"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <a
            href="#caricamento"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Caricamento
          </a>
          <a
            href="#tabella-verifica"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Tabella verifica
          </a>
          <a
            href="#come-funziona"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Come funziona
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onQuickUploadClick}
            className="min-h-10 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
          >
            Carica fattura
          </button>
        </div>
      </div>
    </header>
  );
}
