export function normalizeSpanishTTS(input) {
  let text = String(input || '');

  const replacements = [
    [/\bOpenClaw\b/gi, 'Open Claw'],
    [/\bJarvis\b/gi, 'Yarvis'],
    [/\bWhatsApp\b/gi, 'Guatsap'],
    [/\bTelegram\b/gi, 'Télegram'],
    [/\bSpotify\b/gi, 'Spotifái'],
    [/\bYouTube\b/gi, 'Yutub'],
    [/\bYouTube Music\b/gi, 'Yutub Music'],
    [/\bWi-?Fi\b/gi, 'uai fai'],
    [/\bCDP\b/g, 'ce de pe'],
    [/\bAPI\b/g, 'a pe i'],
    [/\bJSON\b/gi, 'yeison'],
    [/\bURL\b/gi, 'u erre ele'],
    [/\bGPU\b/g, 'ge pe u'],
    [/\bCPU\b/g, 'ce pe u'],
    [/\bTTS\b/g, 'te te ese'],
    [/\bIA\b/g, 'i a'],
    [/\bAI\b/g, 'ei ai'],
    [/\betc\.\b/gi, 'etcétera'],
    [/\be\.g\.\b/gi, 'por ejemplo'],
    [/\bi\.e\.\b/gi, 'es decir'],
    [/\bmr\.\b/gi, 'mister'],
    [/\bmrs\.\b/gi, 'misis'],
    [/\bdr\.\b/gi, 'doctor'],
    [/\bvs\.\b/gi, 'versus'],
    [/\bkg\b/gi, 'kilogramos'],
    [/\bkm\b/gi, 'kilómetros'],
    [/\bGB\b/g, 'gigas'],
    [/\bMB\b/g, 'megas'],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,;:])(\S)/g, '$1 $2')
    .replace(/\.\.\.+/g, '…')
    .trim();

  text = text
    .replace(/([.!?])\s+/g, '$1\n')
    .replace(/([,:;])\s+/g, '$1 ');

  return text;
}
