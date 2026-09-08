export function assertAlignedVersions(versions) {
  const entries = Object.entries(versions);
  if (entries.length === 0) {
    throw new Error("No release versions were provided.");
  }

  const uniqueVersions = new Set(entries.map(([, version]) => version));
  if (uniqueVersions.size !== 1) {
    const details = entries.map(([source, version]) => `${source}=${version}`).join(", ");
    throw new Error(`Release version mismatch: ${details}`);
  }

  return entries[0][1];
}