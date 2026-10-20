import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { interpolate, translate, type DictKey } from "@/i18n";
import { renderWithAppProviders } from "@/test/render-app";
import { PromoQueueCard } from "./PromoQueueCard";
import { INITIAL_HANDLE_PREVIEW, applyHandlePreview, editHandlePreview } from "./promoHandle";

/**
 * Spelled from char codes so this guard does not itself violate the rule it
 * enforces: the promo site never defaults to the owner's account.
 */
const FORBIDDEN_OWNER = String.fromCharCode(109, 97, 102, 104, 112, 101, 114);

/** Expected copy comes from the dictionary, so a translation is not a test break. */
const copy = (key: DictKey, values?: Record<string, string | number>) =>
  interpolate(translate("en", key), values);

function Harness() {
  const [handle, setHandle] = useState(INITIAL_HANDLE_PREVIEW);
  return (
    <PromoQueueCard
      handle={handle}
      onRawChange={(raw) => setHandle((state) => editHandlePreview(state, raw))}
      onApply={() => setHandle((state) => applyHandlePreview(state, state.raw))}
      hover={null}
      onHover={() => {}}
    />
  );
}

function renderQueue() {
  const view = renderWithAppProviders(<Harness />);
  const input = screen.getByLabelText(translate("en", "promoQueueHandleLabel")) as HTMLInputElement;
  const submit = () => {
    const form = input.closest("form");
    if (!form) throw new Error("handle input is not inside a form");
    fireEvent.submit(form);
  };
  return { ...view, input, submit };
}

describe("promo queue card", () => {
  it("labels the sample fleet with the neutral handle", () => {
    const { container } = renderQueue();
    expect(container.textContent).toContain("@acme/checkout-api");
    expect(container.textContent).toContain("@acme/status-page");
    expect(screen.getByText(copy("promoQueueHandleSample", { handle: "acme" }))).toBeInTheDocument();
    expect(container.textContent?.toLowerCase()).not.toContain(FORBIDDEN_OWNER);
  });

  it("relabels every row for a valid handle", () => {
    const { container, input, submit } = renderQueue();
    fireEvent.change(input, { target: { value: "OctoCat" } });
    submit();

    expect(container.textContent).toContain("@octocat/checkout-api");
    expect(container.textContent).toContain("@octocat/status-page");
    expect(container.textContent).not.toContain("@acme/");
    expect(screen.getByText(copy("promoQueueHandlePreview", { handle: "octocat" }))).toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("keeps the last applied handle and explains an invalid one", () => {
    const { container, input, submit } = renderQueue();
    fireEvent.change(input, { target: { value: "octocat" } });
    submit();

    fireEvent.change(input, { target: { value: "not a handle" } });
    submit();

    expect(container.textContent).toContain("@octocat/checkout-api");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "promo-handle-status");

    const status = document.getElementById("promo-handle-status");
    expect(status).not.toBeNull();
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status?.textContent).toContain(copy("promoQueueHandleInvalid"));
  });

  it("returns to the sample fleet when the field is cleared", () => {
    const { container, input, submit } = renderQueue();
    fireEvent.change(input, { target: { value: "octocat" } });
    submit();
    expect(container.textContent).toContain("@octocat/checkout-api");

    fireEvent.change(input, { target: { value: "  " } });
    submit();

    expect(container.textContent).toContain("@acme/checkout-api");
    expect(screen.getByText(copy("promoQueueHandleSample", { handle: "acme" }))).toBeInTheDocument();
    expect(input.value).toBe("  ");
  });

  it("treats a lone @ as empty and restores the sample fleet", () => {
    const { container, input, submit } = renderQueue();
    fireEvent.change(input, { target: { value: "octocat" } });
    submit();
    expect(container.textContent).toContain("@octocat/checkout-api");

    // "@" normalizes to "", which is the documented "back to sample" input.
    fireEvent.change(input, { target: { value: "@" } });
    submit();

    expect(container.textContent).toContain("@acme/checkout-api");
    expect(container.textContent).not.toContain("@octocat/");
    expect(screen.getByText(copy("promoQueueHandleSample", { handle: "acme" }))).toBeInTheDocument();
    expect(input.value).toBe("@");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("filters the queue by status without touching the handle", () => {
    const { container, input } = renderQueue();
    fireEvent.change(input, { target: { value: "octocat" } });
    fireEvent.submit(input.closest("form")!);

    expect(screen.getAllByRole("listitem")).toHaveLength(7);

    fireEvent.click(screen.getByRole("button", { name: /^critical/i }));
    const criticalRows = screen.getAllByRole("listitem");
    expect(criticalRows).toHaveLength(2);
    expect(container.textContent).toContain("@octocat/checkout-api");
    expect(container.textContent).toContain("@octocat/billing-worker");
    expect(container.textContent).not.toContain("@octocat/docs-portal");

    fireEvent.click(screen.getByRole("button", { name: /^healthy/i }));
    const healthyRows = screen.getAllByRole("listitem");
    expect(healthyRows).toHaveLength(3);
    expect(container.textContent).not.toContain("@octocat/checkout-api");

    fireEvent.click(screen.getByRole("button", { name: /^all/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(container.textContent).toContain("@octocat/checkout-api");
  });
});
