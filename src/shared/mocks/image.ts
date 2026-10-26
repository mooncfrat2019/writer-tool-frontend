function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Creates a self-contained placeholder illustration so mock mode works offline.
 */
export function createMockIllustration(label: string, color = '#8a5a2b'): string {
  const title = escapeXml(label.slice(0, 42) || 'Иллюстрация');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
  <rect width="960" height="640" fill="#f3f0e9"/>
  <circle cx="760" cy="110" r="150" fill="${color}" opacity="0.14"/>
  <path d="M0 500 C180 410 300 560 480 480 C660 400 780 500 960 420 L960 640 L0 640Z" fill="${color}" opacity="0.22"/>
  <path d="M0 540 C180 470 320 600 520 520 C700 448 820 550 960 486 L960 640 L0 640Z" fill="#1f1d1a" opacity="0.10"/>
  <text x="64" y="88" fill="#777065" font-family="Georgia, serif" font-size="20" letter-spacing="4">WRITER TOOL</text>
  <text x="64" y="300" fill="#1f1d1a" font-family="Georgia, serif" font-size="48">${title}</text>
  <line x1="64" y1="332" x2="250" y2="332" stroke="${color}" stroke-width="2"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
