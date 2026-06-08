// Language Lens JS skill entry point for Google AI Edge Gallery.
// Pure JavaScript (no HTML wrapper), following the official JS skill examples
// like virtual-piano and restaurant-roulette.
//
// Contract:
//   window['ai_edge_gallery_get_result'](dataStr: string, secret?: string) => Promise<string>
// - dataStr: JSON string sent from the LLM (we only care about language fields)
// - return: JSON string with either { webview, result } or { error }

window['ai_edge_gallery_get_result'] = async (dataStr, _secret) => {
  try {
    let lang = 'en';
    let langName = 'English';

    if (dataStr) {
      const obj = JSON.parse(typeof dataStr === 'string' ? dataStr : String(dataStr));
      if (obj && obj.language) lang = String(obj.language);
      if (obj && obj.languageName) langName = String(obj.languageName);
    }

    const url =
      'webview.html?lang=' +
      encodeURIComponent(lang) +
      '&langName=' +
      encodeURIComponent(langName);

    return JSON.stringify({
      webview: { url },
      result: 'Starting Language Lens AR view for ' + langName + ' (' + lang + ').',
    });
  } catch (e) {
    // Never throw back to the host app; always return a structured error.
    const msg = (e && e.message) ? e.message : String(e);
    return JSON.stringify({ error: 'language-lens skill error: ' + msg });
  }
};
