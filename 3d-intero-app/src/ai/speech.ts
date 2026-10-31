interface SpeechResult {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

export interface SpeechRecognizer {
  lang: string;
  start: () => void;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: (() => void) | null;
}

export interface SpeechHost {
  SpeechRecognition?: new () => SpeechRecognizer;
  webkitSpeechRecognition?: new () => SpeechRecognizer;
}

export function startIndonesianSpeech(
  host: SpeechHost,
  handlers: { onText: (text: string) => void; onUnsupported: () => void; onError: () => void },
): boolean {
  const Ctor = host.SpeechRecognition || host.webkitSpeechRecognition;
  if (!Ctor) {
    handlers.onUnsupported();
    return false;
  }
  const rec = new Ctor();
  rec.lang = 'id-ID';
  rec.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript?.trim();
    if (text) handlers.onText(text);
  };
  rec.onerror = () => handlers.onError();
  try {
    rec.start();
    return true;
  } catch {
    handlers.onError();
    return false;
  }
}
