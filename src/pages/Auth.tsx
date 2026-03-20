import { Link } from "react-router-dom";
import { SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";

export default function AuthPage() {
  return (
    <div className="space-y-10">
      <SectionHeading
        kicker="Secure Runtime"
        title="Browser authentication is local-only."
        body="Push_ accepts a GitHub token only on localhost, keeping it in memory for the current tab. The public Pages runtime stays snapshot-only and never asks for credentials."
      />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] surface-panel p-6">
          <p className="terminal-label">Why this boundary exists</p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
            <p>GitHub Pages is a static host. Asking for Personal Access Tokens there would create an unsafe public surface and increase the blast radius of any frontend issue.</p>
            <p>The current architecture isolates secrets to localhost sessions and trusted snapshot generation paths, then exposes only generated data files to the published frontend.</p>
          </div>
        </div>

        <div className="rounded-[2rem] surface-panel-deep p-6">
          <p className="terminal-label">Runtime Policy</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <StatusPill tone="success">localhost memory session</StatusPill>
            <StatusPill tone="critical">no token on pages</StatusPill>
            <StatusPill tone="warning">static public snapshot</StatusPill>
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/app/settings" className="button-primary-terminal">Open settings</Link>
            <Link to="/faq" className="button-secondary-terminal">Read FAQ</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
