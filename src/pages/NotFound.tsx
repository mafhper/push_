import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="editorial-frame px-6 py-24 md:px-10">
      <div className="rounded-[2rem] surface-panel p-10 md:p-16">
        <p className="section-kicker">404 / unresolved route</p>
        <h1 className="mt-6 text-fluid-4xl font-black tracking-tighter">The semantic terminal could not resolve this path.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          The requested route is not part of the current promo-site or dashboard manifest.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link to="/" className="button-primary-terminal">Go to Home</Link>
          <Link to="/app" className="button-secondary-terminal">Open Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
