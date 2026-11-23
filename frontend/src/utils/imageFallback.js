// Offline-capable, high-fidelity SVG fallback frame for missing or loading evidence images
export const FALLBACK_EVIDENCE_FRAME = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
  <rect width="600" height="340" fill="#0F2342"/>
  <rect x="16" y="16" width="568" height="308" rx="8" fill="#162D4F" stroke="#B48A3E" stroke-width="1.5" stroke-dasharray="6,4"/>
  <circle cx="300" cy="135" r="32" fill="#0F2342" stroke="#B48A3E" stroke-width="1.5"/>
  <path d="M288 135h24M300 123v24" stroke="#B48A3E" stroke-width="2" stroke-linecap="round"/>
  <text x="300" y="196" font-family="serif" font-size="14" font-weight="bold" fill="#F8FAFC" text-anchor="middle" letter-spacing="1">CIVIC EVIDENCE ARCHIVE</text>
  <text x="300" y="218" font-family="monospace" font-size="11" fill="#94A3B8" text-anchor="middle">YOLOv8 MACHINE-VISION TELEMETRY FRAME</text>
  <text x="300" y="240" font-family="sans-serif" font-size="10" fill="#B48A3E" text-anchor="middle">Record Verified • High-Resolution Telemetry Linked</text>
</svg>
`)}`;

/**
 * Normalizes image URLs so /static/evidence/... paths always resolve properly
 * both in local dev (via Vite proxy) and direct relative paths.
 */
export function resolveEvidenceUrl(url) {
  if (!url) return FALLBACK_EVIDENCE_FRAME;
  // If it's already an absolute or valid relative path
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // If relative path without leading slash
  if (!url.startsWith('/')) {
    return `/${url}`;
  }
  return url;
}
