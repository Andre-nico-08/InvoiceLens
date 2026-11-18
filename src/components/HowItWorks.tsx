export function HowItWorks() {
  const steps = [
    {
      index: '01.',
      title: 'Caricamento documenti',
      description:
        'Trascina o seleziona una o più fatture in formato JPG, PNG oppure PDF. I file vengono trasmessi in modo sicuro al server applicativo senza esporre credenziali nel browser.',
    },
    {
      index: '02.',
      title: 'Estrazione strutturata in JSON',
      description:
        'Il backend invia il documento a Gemini (gemini-2.5-flash) con schema JSON vincolato per rilevare data, fornitore, numero documento, imponibile, IVA e totale. I campi assenti restituiscono null.',
    },
    {
      index: '03.',
      title: 'Verifica umana ed export Excel',
      description:
        'Controlla e correggi ogni cella direttamente nella tabella, verifica eventuali campi null evidenziati o scostamenti di somma, quindi scarica il prospetto pronto in formato .xlsx.',
    },
  ];

  return (
    <section
      id="come-funziona"
      aria-labelledby="how-it-works-heading"
      className="mt-10 border-t border-slate-200 pt-12 pb-16"
    >
      <div className="mb-8 max-w-2xl">
        <h2
          id="how-it-works-heading"
          className="text-2xl font-bold tracking-tight text-slate-900"
        >
          Come funziona
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Dalla scansione o PDF della fattura al foglio Excel verificato in tre passaggi lineari.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {steps.map((step) => (
          <article
            key={step.index}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <div className="font-mono text-sm font-semibold text-blue-700">
              {step.index}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {step.description}
            </p>
          </article>
        ))}
      </div>

      <footer className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
        <span>InvoiceLens · Estrazione e verifica contabile</span>
        <span>Formati supportati: JPG, PNG, PDF · Esportazione .xlsx via SheetJS</span>
      </footer>
    </section>
  );
}
