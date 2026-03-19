import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
      <div className="rounded-[2rem] bg-surface-container p-10 text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-secondary">404</p>
        <h1 className="mt-3 text-5xl font-headline font-bold">Signal not found</h1>
        <p className="mt-4 text-muted-foreground">
          The requested route is not part of the current Pages snapshot.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Promo site</Link>
          <Link to="/app" className="rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-foreground">Dashboard</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
