export function getCookieValue(
  cookieHeader: string | undefined,
  cookieName: string
): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex < 0) continue;

    const name = part.slice(0, separatorIndex).trim();
    if (name !== cookieName) continue;

    const value = part.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}
