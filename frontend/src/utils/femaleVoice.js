// Picks a female browser voice for the AI interviewer / self-intro bot, so it always sounds
// like a woman instead of the OS default (often a male voice on Windows).
const FEMALE_NAMES = /(neerja|heera|swara|jenny|aria|ava|emma|sonia|libby|michelle|natasha|clara|zira|hazel|susan|catherine|linda|sara|samantha|karen|tessa|moira|fiona|victoria|veena|serena|zoe|allison|kate|nicky|ellen|amelie|joanna|kendra|salli|kimberly|ivy|female|woman|girl)/i;
const MALE_NAMES = /\b(male|david|mark|james|george|ravi|hemant|prabhat|guy|ryan|daniel|alex|fred|rishi|aaron|arthur|oliver|thomas|liam|eric|brian|christopher|roger|steffan|davis|jason|tony|andrew|brandon|matthew|joey|justin|kevin|russell|geraint)\b/i;
const BAD = /desktop|espeak|compact/i;

let cached = null;
let cachedLang = "";

function score(v, lang) {
  const name = v.name || "";
  const vl = (v.lang || "").toLowerCase();
  if (!vl.startsWith("en") || BAD.test(name)) return -1;
  const isFemale = /female/i.test(name) || (FEMALE_NAMES.test(name) && !MALE_NAMES.test(name.replace(/female/i, "")));
  if (!isFemale) return -1;
  let s = 10;
  if (/(natural|neural|online|enhanced|premium)/i.test(name)) s += 6;
  if (/^microsoft/i.test(name)) s += 2;
  if (/^google/i.test(name)) s += 1;
  if (lang && vl === lang.toLowerCase()) s += 4;
  else if (lang && vl.startsWith(lang.slice(0, 2).toLowerCase())) s += 1;
  if (vl === "en-in") s += 1;
  return s;
}

export function pickFemaleVoice(lang = "en-IN") {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    if (cached && cachedLang === lang) return cached;
    const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
    if (!voices.length) return null;
    let best = null; let bestScore = -1;
    voices.forEach((v) => { const sc = score(v, lang); if (sc > bestScore) { best = v; bestScore = sc; } });
    if (!best) {
      // no known female voice installed: take any English voice that is not clearly male
      best = voices.find((v) => (v.lang || "").toLowerCase().startsWith("en") && !MALE_NAMES.test(v.name || "") && !BAD.test(v.name || "")) || null;
      if (best) { cached = { voice: best, known: false }; cachedLang = lang; return cached; }
      return { voice: null, known: false };
    }
    cached = { voice: best, known: true };
    cachedLang = lang;
    return cached;
  } catch (e) {
    return null;
  }
}

// Sets voice/lang/pitch on an utterance so it speaks with a female voice.
export function applyFemaleVoice(utterance, lang = "en-IN") {
  const pick = pickFemaleVoice(lang);
  if (pick && pick.voice) {
    utterance.voice = pick.voice;
    utterance.lang = pick.voice.lang || lang;
  } else {
    utterance.lang = lang;
  }
  // If only a male/unknown voice is available, raise the pitch so it still sounds feminine.
  utterance.pitch = pick && pick.known ? 1.05 : 1.3;
  return utterance;
}

// Voices load asynchronously in Chrome/Edge — call once so the first utterance already has the list.
export function warmUpVoices() {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener && window.speechSynthesis.addEventListener("voiceschanged", () => { cached = null; });
  } catch (e) { /* best effort */ }
}
