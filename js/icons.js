// 일관된 라인 아이콘 세트 (24x24, stroke=currentColor)
// 이모지 대신 사용해 정갈한 무드를 유지합니다.
const ICONS = {
  health:
    '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1Z"/><path d="M3.5 12.5H8l1.5-3 2 5 1.5-2.5H16"/>',
  beauty:
    '<path d="M12 3c1.8 3 4 4.6 4 8a4 4 0 0 1-8 0c0-3.4 2.2-5 4-8Z"/><path d="M18 15.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z"/>',
  tech:
    '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 5.5h4"/><path d="M11 18.5h2"/>',
  food:
    '<path d="M7 3v7a2 2 0 0 0 2 2v9M9 3v6M5 3v6"/><path d="M17 3c-1.5 1-2.5 3-2.5 5.5V13h2.5V3Zm0 10v8"/>',
  fashion:
    '<path d="M9 4l3 2 3-2 5 4-2.5 2.5L18 9.5V21H6V9.5L4.5 10.5 2 8l5-4"/>',
  appliance:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16"/><path d="M7 6h.01M10 6h.01"/><path d="M7 13v4"/>',
  sports:
    '<path d="M7 4h10v3.5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h2.5v1.5a3 3 0 0 1-3 3M7 5H4.5v1.5a3 3 0 0 0 3 3"/><path d="M9.5 13.5h5M12 13.5V17M8.5 21h7l-.5-2.5h-6L8.5 21Z"/>',
  homedeco:
    '<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M3 11a2 2 0 0 1 2 2v3h14v-3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v6H1v-6a2 2 0 0 1 2-2Z"/><path d="M5 21v1M19 21v1"/>',
  localFood:
    '<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M14 3v18M14 3a4 4 0 0 1 4 4v5h-4"/>',
  localBeauty:
    '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7.5 20 17M8 16.5 20 7"/>',
  localHealth:
    '<path d="M6.5 6.5v11M17.5 6.5v11M4 9v6M20 9v6M6.5 12h11"/>',
};

function iconSVG(key, size = 20) {
  const p = ICONS[key] || "";
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}
