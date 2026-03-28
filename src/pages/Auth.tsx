import { Link } from "react-router-dom";
import { SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";

export default function AuthPage() {
  const { t } = useApp();

  return (
    <div className="space-y-10">
      <SectionHeading
        kicker={t("authKicker")}
        title={t("authTitle")}
        body={t("authBody")}
      />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] surface-panel p-6">
          <p className="terminal-label">{t("authBoundaryTitle")}</p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
            <p>{t("authBoundaryBody1")}</p>
            <p>{t("authBoundaryBody2")}</p>
          </div>
        </div>

        <div className="rounded-[2rem] surface-panel-deep p-6">
          <p className="terminal-label">{t("authPolicyTitle")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <StatusPill tone="success">{t("authPolicyLocal")}</StatusPill>
            <StatusPill tone="critical">{t("authPolicyNoToken")}</StatusPill>
            <StatusPill tone="warning">{t("authPolicySnapshot")}</StatusPill>
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/app/settings" className="button-primary-terminal">{t("authOpenSettings")}</Link>
            <Link to="/faq" className="button-secondary-terminal">{t("authReadFaq")}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
