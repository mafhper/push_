const stack = [
  {
    title: "Vite + React + TypeScript",
    copy: "Single application shell for promo and dashboard surfaces with Pages-friendly static output.",
  },
  {
    title: "Static JSON snapshots",
    copy: "Generated at build time or locally with Node, then consumed by the browser without any embedded secret.",
  },
  {
    title: "GitHub Actions + Pages",
    copy: "Scheduled or on-demand sync can regenerate datasets, build the app and publish artifacts to GitHub Pages.",
  },
  {
    title: "Semantic Terminal design tokens",
    copy: "Space Grotesk, Manrope, carbon surfaces, radioactive green accents and gold signal states.",
  },
];

export default function TechnologyPage() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-10 pb-12">
      <div className="max-w-4xl">
        <p className="text-xs uppercase tracking-[0.28em] text-secondary">Technology stack</p>
        <h1 className="mt-4 text-fluid-5xl font-headline font-bold">Built for Pages, not for secrets in the browser.</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          The stack is intentionally biased toward static delivery, predictable routing and a local secure sync path whenever authenticated GitHub metrics are needed.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {stack.map((item) => (
          <article key={item.title} className="rounded-[1.9rem] bg-surface-container p-7">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Layer</p>
            <h2 className="mt-4 text-3xl font-headline font-bold">{item.title}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.copy}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
