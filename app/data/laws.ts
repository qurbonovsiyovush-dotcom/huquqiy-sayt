export type LawItem = {
  id: number;
  code: string;
  article: string;
  title: string;
  content: string;
  simpleAnswer: string;
  keywords: string[];
};

export const laws: LawItem[] = [
  {
    id: 1,

    code: "O‘zbekiston Respublikasi Jinoyat-protsessual kodeksi",

    article: "23-modda",

    title: "Aybsizlik prezumpsiyasi",

    content: `
Gumon qilinuvchi, ayblanuvchi yoki sudlanuvchi uning jinoyat sodir etishda
aybdorligi qonunda nazarda tutilgan tartibda isbotlangunga va qonuniy kuchga
kirgan sud hukmi bilan aniqlangunga qadar aybsiz hisoblanadi.

Gumon qilinuvchi, ayblanuvchi yoki sudlanuvchi o‘zining aybsizligini
isbotlab berishi shart emas.

Aybdorlikka oid barcha shubhalar, basharti ularni bartaraf etish
imkoniyatlari tugagan bo‘lsa, gumon qilinuvchi, ayblanuvchi yoki
sudlanuvchining foydasiga hal qilinishi lozim.
    `.trim(),

    simpleAnswer: `
Aybsizlik prezumpsiyasi — shaxsning aybi qonunda belgilangan tartibda
isbotlanib, sudning qonuniy kuchga kirgan hukmi bilan aniqlanmaguncha
u aybsiz hisoblanishini anglatuvchi huquqiy prinsipdir.

O‘zbekiston Respublikasi Jinoyat-protsessual kodeksining 23-moddasiga ko‘ra,
gumon qilinuvchi, ayblanuvchi yoki sudlanuvchi o‘zining aybsizligini
isbotlashga majbur emas. Aybdorlikka oid bartaraf etib bo‘lmaydigan
shubhalar uning foydasiga hal qilinadi.

Sodda qilib aytganda: shaxsning aybdorligi qonuniy tartibda
isbotlanmaguncha u aybsiz hisoblanadi.
    `.trim(),

    keywords: [
      "aybsizlik prezumpsiyasi",
      "aybsizlik",
      "prezumpsiya",
      "23-modda",
      "23 modda",
      "jpk 23",
      "gumon qilinuvchi",
      "ayblanuvchi",
      "sudlanuvchi",
    ],
  },
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[ʻʼ’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function findLaw(question: string): LawItem | null {
  const q = normalize(question);

  let bestLaw: LawItem | null = null;
  let bestScore = 0;

  for (const law of laws) {
    let score = 0;

    const title = normalize(law.title);
    const article = normalize(law.article);

    if (q.includes(title)) {
      score += 100;
    }

    if (q.includes(article)) {
      score += 100;
    }

    for (const keyword of law.keywords) {
      if (q.includes(normalize(keyword))) {
        score += 30;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestLaw = law;
    }
  }

  return bestScore > 0 ? bestLaw : null;
}