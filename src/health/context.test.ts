import { describe, expect, it } from "vitest";
import { contextFromSnapshotDetail, evaluateRepositoryHealth } from "@/health";
import { createRepoDetail } from "@/test/factories";

describe("contextFromSnapshotDetail", () => {
  it("maps snapshot detail fields into a HealthContext", () => {
    const detail = createRepoDetail({
      status: { generatedAt: "2026-03-19T12:00:00.000Z", generatedBy: "seed", dataMode: "public" },
      extended: {
        releases: [
          {
            id: 1,
            tagName: "v1.0.0",
            name: "v1.0.0",
            publishedAt: "2026-03-01T00:00:00.000Z",
            htmlUrl: "https://github.com/mafhper/push_/releases/tag/v1.0.0",
            draft: false,
            prerelease: false,
          },
        ],
        branchProtection: { available: true, protected: true },
        readme: { text: "push_", htmlUrl: "https://github.com/mafhper/push_#readme" },
        rootTree: ["src", "package.json", "package-lock.json"],
        codeScanning: { openAlerts: 0 },
        pages: { configured: true, url: "https://mafhper.github.io/push_", lastBuildStatus: "built" },
        security: { advancedSecurity: true, secretScanning: true },
      },
    });

    const context = contextFromSnapshotDetail(detail);

    expect(context.repo.fullName).toBe("mafhper/push_");
    expect(context.runs).toHaveLength(1);
    expect(context.alerts).toEqual([]);
    expect(context.availability?.dependabotAlerts?.available).toBe(false);
    expect(context.releases).toHaveLength(1);
    expect(context.branchProtection?.protected).toBe(true);
    expect(context.readmeAvailable).toBe(true);
    expect(context.rootTree).toContain("package-lock.json");
    expect(context.codeScanning).toEqual({ openAlerts: 0 });
    expect(context.pages?.lastBuildStatus).toBe("built");
    expect(context.security?.secretScanning).toBe(true);
    expect(context.dataMode).toBe("public");
  });

  it("reports readme as unavailable when extended data is missing", () => {
    const context = contextFromSnapshotDetail(createRepoDetail({ extended: undefined }));
    expect(context.releases).toBeUndefined();
    expect(context.branchProtection).toBeUndefined();
    expect(context.readmeAvailable).toBeUndefined();
  });

  it("feeds engine so branch protection and releases checks are scored", () => {
    const publishedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const report = evaluateRepositoryHealth(
      contextFromSnapshotDetail(
        createRepoDetail({
          extended: {
            releases: [
              {
                id: 1,
                tagName: "v1.2.3",
                name: "v1.2.3",
                publishedAt,
                htmlUrl: "",
                draft: false,
                prerelease: false,
              },
            ],
            branchProtection: { available: true, protected: true },
            readme: { text: "push_", htmlUrl: "" },
          },
        }),
      ),
    );

    const categories = report.categories;
    const governance = categories.find((category) => category.category === "governance");
    const release = categories.find((category) => category.category === "release");
    expect(governance?.checks.find((check) => check.id === "default_branch_exists")?.status).toBe("pass");
    expect(governance?.checks.find((check) => check.id === "default_branch_protected")?.status).toBe("pass");
    expect(release?.checks.find((check) => check.id === "latest_release_exists")?.status).toBe("pass");
    expect(release?.checks.find((check) => check.id === "release_recency")?.status).toBe("pass");
  });
});