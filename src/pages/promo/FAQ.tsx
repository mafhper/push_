const faq = [
  {
    question: "Why does the public site no longer accept a GitHub token?",
    answer: "GitHub Pages is a public static host. Accepting or storing PATs in the browser would reintroduce the exact secret exposure the transition is meant to remove.",
  },
  {
    question: "How do I get richer data like Dependabot alerts?",
    answer: "Run the local snapshot sync with `.env.local`, or configure the Pages workflow to use a repository secret. The token stays server-side in both cases.",
  },
  {
    question: "Can the Pages build still work without a token?",
    answer: "Yes. The sync script falls back to public GitHub endpoints and marks authenticated-only sections as unavailable instead of breaking the site.",
  },
  {
    question: "Why keep promo pages and dashboard in one repo?",
    answer: "One repository keeps the design system, routing, copy and deployment pipeline aligned while still allowing a clean `/` and `/app` separation.",
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-8 pb-12">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.28em] text-secondary">FAQ</p>
        <h1 className="mt-4 text-fluid-5xl font-headline font-bold">Security, data freshness and Pages behavior.</h1>
      </div>
      <div className="space-y-4">
        {faq.map((item) => (
          <details key={item.question} className="rounded-[1.75rem] bg-surface-container p-6">
            <summary className="cursor-pointer list-none text-xl font-headline font-bold">{item.question}</summary>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
