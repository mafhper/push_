import { describe, expect, it } from "vitest";
import { buildAvatarCandidates, extractPagesAssets, repoInitials, scanBundleAssets } from "@/lib/repo-logo";

describe("repoInitials", () => {
  it("uses the first two letters for a single word", () => {
    expect(repoInitials("supermol")).toBe("SU");
    expect(repoInitials("nebula")).toBe("NE");
    expect(repoInitials("icon-core")).toBe("IC");
  });

  it("uses the first letter of the first two words", () => {
    expect(repoInitials("sonara_hub")).toBe("SH");
    expect(repoInitials("release-core")).toBe("RC");
  });

  it("handles empty or punctuation-only names", () => {
    expect(repoInitials("")).toBe("?");
    expect(repoInitials("---")).toBe("?");
  });

  it("keeps casing normalized to uppercase", () => {
    expect(repoInitials("mafhper")).toBe("MA");
    expect(repoInitials("a-b")).toBe("AB");
  });
});

describe("buildAvatarCandidates", () => {
  it("returns the branded favicon for app repos", () => {
    expect(buildAvatarCandidates("mafhper", "push_underline", "main")).toEqual(["/favicon.svg"]);
  });

  it("returns a curated known logo before guessing", () => {
    const sonara = buildAvatarCandidates("mafhper", "sonara_hub", "main");
    expect(sonara[0]).toBe("https://mafhper.github.io/sonara_hub/brand/sonara-mark.svg");

    const releaseCore = buildAvatarCandidates("mafhper", "release-core", "main");
    expect(releaseCore[0]).toBe(
      "https://raw.githubusercontent.com/mafhper/release-core/main/docs/images/logo/icon-512.png",
    );
  });

  it("tries raw.githubusercontent paths from the default branch", () => {
    const candidates = buildAvatarCandidates("mafhper", "some-project", "main");
    expect(candidates).toContain("https://raw.githubusercontent.com/mafhper/some-project/main/logo.svg");
    expect(candidates).toContain("https://raw.githubusercontent.com/mafhper/some-project/main/docs/images/logo/icon-512.png");
    expect(candidates).toContain("https://raw.githubusercontent.com/mafhper/some-project/main/src-tauri/icons/icon.png");
  });

  it("tries GitHub Pages paths per repository", () => {
    const candidates = buildAvatarCandidates("mafhper", "some-project", "main");
    expect(candidates).toContain("https://mafhper.github.io/some-project/logo.png");
    expect(candidates).toContain("https://mafhper.github.io/some-project/favicon.svg");
  });

  it("tries the profile root on GitHub Pages when owner equals repo", () => {
    const candidates = buildAvatarCandidates("alice", "alice", "main");
    expect(candidates).toContain("https://alice.github.io/logo.svg");
    expect(candidates).toContain("https://alice.github.io/alice/logo.svg");
  });

  it("never falls back to the GitHub social preview card", () => {
    const candidates = buildAvatarCandidates("mafhper", "unknown-project", "main");
    const hosts = candidates.map((candidate) => {
      try {
        return new URL(candidate).host;
      } catch {
        return "";
      }
    });
    expect(hosts).not.toContain("opengraph.githubassets.com");
    expect(hosts).not.toContain("repository-images.githubusercontent.com");
  });
});

describe("extractPagesAssets", () => {
  const pageUrl = "https://mafhper.github.io/dinopad/";

  it("collects home assets with image extensions first", () => {
    const html = `
      <html>
        <head>
          <link rel="icon" href="/dinopad/favicon.ico" />
          <meta property="og:image" content="https://opengraph.githubassets.com/abc/mafhper/dinopad" />
        </head>
        <body>
          <img src="/dinopad/assets/dinopad-dilophosaurus-home-768-orRc8lHl.avif" alt="logo" />
          <script src="/dinopad/assets/index-BxgqBk0q.js"></script>
        </body>
      </html>`;
    const assets = extractPagesAssets(html, pageUrl);
    expect(assets).toContain("https://mafhper.github.io/dinopad/assets/dinopad-dilophosaurus-home-768-orRc8lHl.avif");
    expect(assets).toContain("https://mafhper.github.io/dinopad/favicon.ico");
    expect(assets[0]).toContain("/assets/");
  });

  it("drops scripts, non-https refs and cross-host URLs", () => {
    const html = `
      <img src="/dinopad/assets/app.png" />
      <script src="/dinopad/assets/index-BxgqBk0q.js"></script>
      <img src="http://mafhper.github.io/dinopad/assets/bad.png" />
      <img src="https://cdn.example.com/logo.png" />
      <img src="data:image/png;base64,AAAA" />`;
    const assets = extractPagesAssets(html, pageUrl);
    expect(assets).toEqual(["https://mafhper.github.io/dinopad/assets/app.png"]);
  });

  it("resolves relative references against the page URL", () => {
    const html = `<img src="assets/relative-logo.webp" />`;
    const assets = extractPagesAssets(html, pageUrl);
    expect(assets).toEqual(["https://mafhper.github.io/dinopad/assets/relative-logo.webp"]);
  });
});

describe("scanBundleAssets", () => {
  const pageUrl = "https://mafhper.github.io/dinopad/";

  it("finds image asset URLs quoted inside JS/CSS bundles", () => {
    const text = `
      const logo = "/dinopad/assets/dinopad-dilophosaurus-home-768-orRc8lHl.avif";
      document.body.style.background = "url(/dinopad/assets/home-bg.webp)";
      import icon from "./assets/icon.svg";
      const data = "/dinopad/assets/data.json";
      const ext = "https://cdn.example.com/logo.png";`;
    const assets = scanBundleAssets(text, pageUrl);
    expect(assets).toEqual([
      "https://mafhper.github.io/dinopad/assets/dinopad-dilophosaurus-home-768-orRc8lHl.avif",
      "https://mafhper.github.io/dinopad/assets/home-bg.webp",
      "https://mafhper.github.io/dinopad/assets/icon.svg",
    ]);
  });

  it("ignores non-asset and cross-host references", () => {
    const text = `
      const json = "/dinopad/assets/config.json";
      const jpeg = "http://mafhper.github.io/dinopad/assets/image.jpeg";
      const hashed = "/other-repo/assets/logo.png";
      const inline = "data:image/png;base64,AAAA";`;
    expect(scanBundleAssets(text, pageUrl)).toEqual([]);
  });
});