import { describe, expect, it } from "vitest";
import {
  INITIAL_HANDLE_PREVIEW,
  applyHandlePreview,
  editHandlePreview,
  isValidHandle,
  normalizeHandle,
} from "./promoHandle";

describe("GitHub handle validation", () => {
  it("accepts handles GitHub accepts", () => {
    for (const handle of ["a", "acme", "AcMe", "a-b", "a1", "my-org-2026", "x".repeat(39)]) {
      expect(isValidHandle(handle), handle).toBe(true);
    }
  });

  it("rejects handles GitHub refuses", () => {
    for (const handle of ["-acme", "acme-", "ac me", "ac_me", "ac.me", "a--", "x".repeat(40)]) {
      expect(isValidHandle(handle), handle).toBe(false);
    }
  });

  it("normalizes pasted handles", () => {
    expect(normalizeHandle("  @AcMe ")).toBe("acme");
    expect(normalizeHandle("@@acme")).toBe("acme");
    expect(normalizeHandle("   ")).toBe("");
  });
});

describe("queue handle preview", () => {
  it("starts on the bundled sample fleet", () => {
    expect(INITIAL_HANDLE_PREVIEW.applied).toBe("acme");
    expect(INITIAL_HANDLE_PREVIEW.sample).toBe(true);
    expect(INITIAL_HANDLE_PREVIEW.error).toBe(false);
  });

  it("relabels the queue for a valid handle", () => {
    const next = applyHandlePreview(INITIAL_HANDLE_PREVIEW, "OctoCat");
    expect(next.applied).toBe("octocat");
    expect(next.sample).toBe(false);
    expect(next.error).toBe(false);
    expect(next.raw).toBe("OctoCat");
  });

  it("keeps the last applied handle and raises the error for an invalid one", () => {
    const applied = applyHandlePreview(INITIAL_HANDLE_PREVIEW, "octocat");
    const rejected = applyHandlePreview(applied, "not a handle");
    expect(rejected.applied).toBe("octocat");
    expect(rejected.error).toBe(true);
    expect(rejected.sample).toBe(false);
    expect(rejected.raw).toBe("not a handle");
  });

  it("restores the sample fleet when the field is emptied and submitted", () => {
    const applied = applyHandlePreview(INITIAL_HANDLE_PREVIEW, "octocat");
    const cleared = applyHandlePreview(applied, "   ");
    expect(cleared.applied).toBe("acme");
    expect(cleared.sample).toBe(true);
    expect(cleared.error).toBe(false);
  });

  it("clears the error while typing without changing the applied handle", () => {
    const rejected = applyHandlePreview(INITIAL_HANDLE_PREVIEW, "not a handle");
    const typing = editHandlePreview(rejected, "not a handle!");
    expect(typing.error).toBe(false);
    expect(typing.applied).toBe("acme");
  });
});
