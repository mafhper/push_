import { Link } from "react-router-dom";
import { SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { ArrowRight, Github, ShieldCheck, Waves } from "lucide-react";

const featureCards = [
  {
    title: "Public Repos",
    body: "Track only the public repositories you choose to show.",
    tone: "success",
  },
  {
    title: "Safe on Pages",
    body: "The published site runs without browser tokens.",
    tone: "warning",
  },
  {
    title: "Fast Scan",
    body: "Health, activity and alerts stay easy to read at a glance.",
    tone: "neutral",
  },
  {
    title: "Responsive",
    body: "Promo site and dashboard work across desktop and mobile.",
    tone: "success",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-24">
      <section className="hero-glow relative grid gap-12 pt-10 xl:grid-cols-[0.96fr_1.04fr] xl:items-center">
        <div className="space-y-10 xl:pb-10">
          <SectionHeading
            title={
              <>
                <span className="text-foreground">Public GitHub stats.</span>
                <br />
                One <span className="text-primary">dashboard.</span>
              </>
            }
            body="Monitor selected public repositories with a GitHub Pages-safe dashboard."
          />

          <div className="flex flex-wrap gap-4">
            <Link to="/app" className="button-primary-terminal">
              Open dashboard
              <ArrowRight size={16} />
            </Link>
            <a href="https://github.com/mafhper/push_" className="button-secondary-terminal">
              View repository
            </a>
          </div>
        </div>

        <div className="rounded-[2.4rem] surface-panel p-5 shadow-[0_0_32px_rgba(0,0,0,0.22)]">
          <div className="rounded-[1.8rem] bg-black/20 p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-secondary/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/80" />
              </div>
              <StatusPill tone="success">snapshot live</StatusPill>
            </div>
            <div className="terminal-grid rounded-[1.25rem] bg-[#101010] p-6">
              <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-3xl surface-panel p-5 md:p-6">
                  <p className="terminal-label">Fleet health</p>
                  <p className="mt-4 text-5xl font-black text-primary md:text-6xl">99.8%</p>
                  <p className="mt-3 text-sm text-muted-foreground">Snapshot-backed public view.</p>
                </div>
                <div className="rounded-3xl surface-panel-deep p-5 md:p-6">
                  <p className="terminal-label">Security</p>
                  <div className="mt-5 h-28">
                    <div className="flex h-full items-end gap-2">
                      {[52, 74, 58, 88, 66, 82, 94].map((value) => (
                        <div key={value} className="w-full rounded-t-md bg-primary/80" style={{ height: `${value}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl surface-panel-deep p-4">
                  <p className="terminal-label">tracked</p>
                  <p className="mt-3 text-2xl font-black">04 repos</p>
                </div>
                <div className="rounded-3xl surface-panel-deep p-4">
                  <p className="terminal-label">local auth</p>
                  <p className="mt-3 text-2xl font-black">local-only</p>
                </div>
                <div className="rounded-3xl surface-panel-deep p-4">
                  <p className="terminal-label">pages</p>
                  <p className="mt-3 text-2xl font-black">safe</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {featureCards.map((card) => (
          <article key={card.title} className="rounded-[1.9rem] surface-panel p-6">
            <div className="mb-5 flex items-center justify-between">
              <StatusPill tone={card.tone === "warning" ? "warning" : card.tone === "success" ? "success" : "neutral"}>
                {card.tone === "warning" ? "gold" : card.tone === "success" ? "green" : "neutral"}
              </StatusPill>
              {card.title === "WCAG AAA" ? <ShieldCheck size={16} className="text-secondary" /> : card.title === "Dual Atmosphere" ? <Waves size={16} className="text-primary" /> : <Github size={16} className="text-foreground/30" />}
            </div>
            <h3 className="text-xl font-bold">{card.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.body}</p>
          </article>
        ))}
      </section>

      <section className="space-y-10 rounded-[2.7rem] surface-panel-deep px-6 py-20 md:px-10">
        <SectionHeading
          align="center"
          title="What you can see."
          body="Repository health, workflow status, languages and security posture in one place."
        />

        <div className="mx-auto max-w-5xl rounded-[2rem] surface-panel p-5 shadow-[0_0_32px_rgba(0,0,0,0.22)]">
          <div className="rounded-[1.5rem] bg-black/18 p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="terminal-label">repository diagnostics</p>
              <StatusPill tone="success">public dataset</StatusPill>
            </div>
            <div className="overflow-hidden rounded-[1.25rem] surface-panel-deep">
              <table className="w-full text-left">
                <thead className="bg-white/[0.02] font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/55">
                  <tr>
                    <th className="px-4 py-4 font-medium">Repo</th>
                    <th className="px-4 py-4 font-medium">Status</th>
                    <th className="px-4 py-4 font-medium">Mode</th>
                    <th className="px-4 py-4 font-medium">Alert Surface</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    ["push_", "healthy", "public pages", "clear"],
                    ["imaginizim", "tracked", "local sync", "rich"],
                    ["spread", "snapshot", "public pages", "safe"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-t border-white/[0.03]">
                      {row.map((cell) => <td key={cell} className="px-4 py-4 text-foreground/70">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8 py-14 text-center">
        <SectionHeading
          align="center"
          title="Open the dashboard."
          body="See the public view or inspect the source."
        />
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/app" className="button-primary-terminal">Open App</Link>
          <a href="https://github.com/mafhper/push_" className="button-secondary-terminal">Open GitHub</a>
        </div>
      </section>
    </div>
  );
}
