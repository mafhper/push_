import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppProvider } from "@/contexts/AppContext";
import type { AccountQuotaSnapshot, QuotaFamily } from "@/quotas";
import { QuotasSection } from "./QuotasSection";

function createFamily(overrides: Partial<QuotaFamily> = {}): QuotaFamily {
  return {
    id: "actionsMinutes",
    used: 1600,
    limit: 2000,
    unit: "minutes",
    resetAt: null,
    origin: "billing",
    monthly: true,
    ...overrides,
  };
}

function createSnapshot(overrides: Partial<AccountQuotaSnapshot> = {}): AccountQuotaSnapshot {
  return {
    fetchedAt: "2026-10-19T12:00:00.000Z",
    login: "betafunda",
    billing: "enhanced",
    families: [createFamily()],
    repos: [],
    repoProbe: { probed: 0, requested: 0 },
    foreignOwners: [],
    foreignRepoCount: 0,
    ...overrides,
  };
}

function renderSection(props: Partial<Parameters<typeof QuotasSection>[0]> = {}) {
  return render(
    <AppProvider>
      <QuotasSection
        snapshot={createSnapshot()}
        isLoading={false}
        isError={false}
        hasSession
        onRetry={vi.fn()}
        {...props}
      />
    </AppProvider>,
  );
}

describe("QuotasSection", () => {
  it("renders the family in its original unit with the percentage and the band", () => {
    renderSection();

    const section = screen.getByRole("heading", { name: "GitHub quotas" }).closest("section") as HTMLElement;
    expect(within(section).getByText("Actions minutes")).toBeInTheDocument();
    expect(within(section).getByText("1,600 / 2,000 min")).toBeInTheDocument();
    expect(within(section).getByText("80%")).toBeInTheDocument();
    expect(within(section).getByText("Near the limit")).toBeInTheDocument();
    expect(within(section).getByRole("progressbar", { name: "Actions minutes" })).toHaveAttribute("aria-valuenow", "80");
    // No reset date from the API: a dash, not an invented day.
    expect(within(section).getByText("—")).toBeInTheDocument();
    expect(within(section).getByText("Account @betafunda")).toBeInTheDocument();
  });

  it("puts an exceeded family in the top band and states the impact", () => {
    renderSection({
      snapshot: createSnapshot({
        families: [createFamily({ id: "sharedStorage", used: 512, limit: 500, unit: "mb" })],
      }),
    });

    const section = screen.getByRole("heading", { name: "GitHub quotas" }).closest("section") as HTMLElement;
    expect(within(section).getByText("512 / 500 MB")).toBeInTheDocument();
    expect(within(section).getByText("102%")).toBeInTheDocument();
    expect(within(section).getByText("Limit exceeded")).toBeInTheDocument();
    // The bar and the pill carry the state; the old impact sentence is gone.
    expect(within(section).queryByText(/may be blocked until the cycle renews/)).not.toBeInTheDocument();
  });

  it("states the no-token case instead of showing zeroed quotas", () => {
    renderSection({ snapshot: undefined, hasSession: false });

    expect(screen.getByText("No token connected")).toBeInTheDocument();
    expect(screen.getByText("Connect a GitHub token to read the account quotas.")).toBeInTheDocument();
    expect(screen.queryByText("Actions minutes")).not.toBeInTheDocument();
  });

  it("explains a forbidden billing token and offers a retry", () => {
    const onRetry = vi.fn();
    renderSection({
      snapshot: createSnapshot({
        billing: "forbidden",
        billingMessage: "403 /users/betafunda/settings/billing/usage",
        families: [],
      }),
      onRetry,
    });

    expect(screen.getByText("Billing data unavailable for this token")).toBeInTheDocument();
    expect(screen.getByText(/classic personal access token/)).toBeInTheDocument();
    expect(screen.getByText("403 /users/betafunda/settings/billing/usage")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps the last snapshot timestamp visible and offers a retry when the API is down", () => {
    renderSection({
      snapshot: createSnapshot({
        billing: "error",
        billingMessage: "network down (/users/betafunda/settings/billing/usage)",
      }),
      isError: true,
    });

    expect(screen.getByText("Could not reach the billing API")).toBeInTheDocument();
    expect(screen.getByText("network down (/users/betafunda/settings/billing/usage)")).toBeInTheDocument();
    expect(screen.getByText(/^Updated /)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("keeps per-repository usage closed with the count on the header, and opens it on demand", () => {
    renderSection({
      snapshot: createSnapshot({
        repos: [
          {
            fullName: "betafunda/push_",
            cacheMb: 1536,
            cacheCount: 4,
            artifactsMb: 64,
            actionsMinutes: 1200,
          },
        ],
        repoProbe: { probed: 1, requested: 1 },
      }),
    });

    const section = screen.getByRole("heading", { name: "GitHub quotas" }).closest("section") as HTMLElement;
    const toggle = within(section).getByRole("button", { name: /Usage by repository/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(section).queryByText("betafunda/push_")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(section).getByText("betafunda/push_")).toBeInTheDocument();

    // The row is its own disclosure (PU15): the readings belong to the detail.
    const row = within(section).getByRole("button", { name: "betafunda/push_" });
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(within(section).queryByText("Cache 1.5 GB / 10 GB")).not.toBeInTheDocument();
    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(within(section).getByText("Cache 1.5 GB / 10 GB")).toBeInTheDocument();
    expect(within(section).getByText("Artifacts 64 MB")).toBeInTheDocument();
    expect(within(section).getByText("1,200 min")).toBeInTheDocument();
    // The long explanation is a disclosure, not a wall of text.
    expect(within(section).queryByText(/point-in-time inventories/)).not.toBeInTheDocument();
    fireEvent.click(within(section).getByRole("button", { name: "Per-repository data" }));
    expect(within(section).getByText(/point-in-time inventories/)).toBeInTheDocument();
  });
});
