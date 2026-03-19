export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-10 pb-12">
      <div className="max-w-4xl">
        <p className="text-xs uppercase tracking-[0.28em] text-secondary">About the creator</p>
        <h1 className="mt-4 text-fluid-5xl font-headline font-bold">A promo surface for public repositories, not another generic portfolio shell.</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          Push_ is built as a personal publishing surface for open repositories: one part promo site, one part operational overview, all delivered with static hosting constraints taken seriously.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-[1.75rem] bg-surface-container p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Positioning</p>
          <h2 className="mt-4 text-2xl font-headline font-bold">Editorial over template</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            The design system rejects default SaaS cards and light themes in favor of tonal zoning, asymmetric spacing and data-first clarity.
          </p>
        </article>
        <article className="rounded-[1.75rem] bg-surface-container p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Architecture</p>
          <h2 className="mt-4 text-2xl font-headline font-bold">Static by default</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            The application treats secure snapshot generation as the core primitive. Local live enrichments are allowed, but only outside the browser runtime.
          </p>
        </article>
        <article className="rounded-[1.75rem] bg-surface-container p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Output</p>
          <h2 className="mt-4 text-2xl font-headline font-bold">GitHub-native delivery</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            The final product is meant to live inside the GitHub ecosystem: repository, actions workflow, Pages deploy and linked public artifacts.
          </p>
        </article>
      </div>
    </div>
  );
}
