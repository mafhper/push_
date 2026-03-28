import { Link } from "react-router-dom";
import { useApp } from "@/contexts/useApp";

export default function NotFound() {
  const { t } = useApp();

  return (
    <div className="editorial-frame px-6 py-24 md:px-10">
      <div className="rounded-[2rem] surface-panel p-10 md:p-16">
        <p className="section-kicker">{t("notFoundKicker")}</p>
        <h1 className="mt-6 text-fluid-4xl font-black tracking-tighter">{t("notFoundTitle")}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          {t("notFoundBody")}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link to="/" className="button-primary-terminal">{t("notFoundGoHome")}</Link>
          <Link to="/app" className="button-secondary-terminal">{t("notFoundOpenDashboard")}</Link>
        </div>
      </div>
    </div>
  );
}
