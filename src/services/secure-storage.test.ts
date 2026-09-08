import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearGithubToken, loadGithubToken, saveGithubToken } from "@/services/secure-storage";

const keyring = vi.hoisted(() => ({
  getPasswords: vi.fn(),
  setPasswords: vi.fn(),
  deletePasswords: vi.fn(),
  joinKeyPrefix: vi.fn((prefix: string, name: string) => `${prefix}.${name}`),
}));

vi.mock("tauri-plugin-keyring-store-api", () => keyring);
vi.mock("@/config/site", async () => {
  const actual = await vi.importActual<typeof import("@/config/site")>("@/config/site");
  return { ...actual, isTauriRuntime: vi.fn(() => false) };
});

describe("secure-storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null outside the Tauri runtime", async () => {
    await expect(loadGithubToken()).resolves.toBeNull();
    expect(keyring.getPasswords).not.toHaveBeenCalled();
  });

  it("does not invoke the keyring outside the Tauri runtime", async () => {
    await saveGithubToken("ghp_token");
    await clearGithubToken();
    expect(keyring.setPasswords).not.toHaveBeenCalled();
    expect(keyring.deletePasswords).not.toHaveBeenCalled();
  });

  it("persists, loads and clears with the keyring inside the Tauri runtime", async () => {
    const { isTauriRuntime } = await import("@/config/site");
    vi.mocked(isTauriRuntime).mockReturnValue(true);
    keyring.getPasswords.mockResolvedValue(["ghp_token"]);
    keyring.setPasswords.mockResolvedValue(undefined);
    keyring.deletePasswords.mockResolvedValue(undefined);

    await saveGithubToken("ghp_token");
    expect(keyring.setPasswords).toHaveBeenCalledWith([{ account: expect.stringContaining("push.github_token"), secret: "ghp_token" }]);

    await expect(loadGithubToken()).resolves.toBe("ghp_token");
    expect(keyring.getPasswords).toHaveBeenCalledTimes(1);

    await clearGithubToken();
    expect(keyring.deletePasswords).toHaveBeenCalledTimes(1);
  });
});