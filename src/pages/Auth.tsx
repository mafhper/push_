import { Link } from "react-router-dom";

export default function AuthPage() {
  return (
    <div className="mx-auto max-w-4xl rounded-[2rem] bg-surface-container p-8">
      <p className="text-xs uppercase tracking-[0.28em] text-secondary">Local secure mode</p>
      <h1 className="mt-3 text-fluid-4xl font-headline font-bold">Browser auth was removed.</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        The public site no longer accepts GitHub tokens in the browser. Regenerate the snapshot locally with `.env.local` and the `data:sync` script, or use the GitHub Pages workflow with repository secrets.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/app/settings" className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">
          Open settings
        </Link>
        <Link to="/" className="rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-foreground">
          Return to site
        </Link>
      </div>
    </div>
  );
}
