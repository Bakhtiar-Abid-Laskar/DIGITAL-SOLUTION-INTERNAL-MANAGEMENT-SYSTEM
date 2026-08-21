export function getDriveImageUrl(fileId: string | null | undefined): string | undefined {
  if (!fileId) return undefined;
  return `https://drive.google.com/uc?id=${fileId}`;
}
