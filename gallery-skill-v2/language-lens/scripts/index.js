// Language Lens JS skill entry point for Google AI Edge Gallery.
// This file is pure JavaScript (no HTML wrapper) to match the official
// JS skill contract described in the Gallery README.
//
// Contract:
//   window['ai_edge_gallery_get_result'](data: string) => Promise<string>
// where `data` is a JSON string and the return value is also a JSON string.
//
// This skill returns a WebView URL for the AR UI plus a short `result`
// message for the chat transcript.

window['ai_edge_gallery_get_result'] = async (data) => {
  let lang = 'en';
  let langName = 'English';

  try {
    const obj = JSON.parse(data ?? '{}');
    if (obj && obj.language) lang = String(obj.language);
    if (obj && obj.languageName) langName = String(obj.languageName);
  } catch (e) {
    // Keep defaults if parsing fails.
  }

  // Tell Gallery to open the embedded webview for this skill.
  // NOTE: webview.html lives under assets/ in the skill bundle,
  // so we point to assets/webview.html here (same pattern as
  // the official virtual-piano example which returns a local UI file).
  return JSON.stringify({
    result: 'Starting Language Lens AR view.',
    webview: {
      url:
        'assets/webview.html?lang=' +
        encodeURIComponent(lang) +
        '&langName=' +
        encodeURIComponent(langName),
      aspectRatio: 1.0,
    },
  });
};
