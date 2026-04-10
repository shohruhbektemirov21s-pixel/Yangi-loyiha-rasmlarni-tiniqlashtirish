export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatFileType(mimeType: string): string {
  if (!mimeType) {
    return "Unknown";
  }

  const normalized = mimeType.split("/").at(-1)?.toUpperCase() ?? mimeType.toUpperCase();
  if (normalized === "JPG") {
    return "JPEG";
  }

  return normalized;
}
