"use client";

import { useRouter } from "next/navigation";

type DictionaryCard = {
  title: string;
  subtitle: string;
  href: string;
  badge: string;
};

const DICTIONARIES: DictionaryCard[] = [
  { title: "English–Uzbek lug‘ati", subtitle: "Inglizcha so‘zlarni o‘zbekcha ma’nosi bilan qidiring", href: "/dictionaries/english-uzbek", badge: "EN-UZ" },
  { title: "Phrasal Verbs", subtitle: "Eng ko‘p ishlatiladigan phrasal verblar va tarjimalari", href: "/dictionaries/phrasal-verbs", badge: "PV" },
  { title: "Irregular Verbs", subtitle: "V1, V2, V3 shakllari va o‘zbekcha tarjimasi", href: "/dictionaries/irregular-verbs", badge: "V1-3" },
  { title: "Synonyms", subtitle: "Inglizcha so‘zlarning sinonimlarini toping", href: "/dictionaries/synonyms", badge: "SYN" },
  { title: "Antonyms", subtitle: "Inglizcha so‘zlarning antonimlarini toping", href: "/dictionaries/antonyms", badge: "ANT" },
  { title: "Academic Words", subtitle: "IELTS va akademik ingliz tili uchun muhim so‘zlar", href: "/dictionaries/academic", badge: "AW" },
];

export default function DictionariesPage() {
  const router = useRouter();

  return (
    <main className="page">
      <header className="topbar">
        <button type="button" className="backButton" onClick={() => router.push("/")}>
          Bosh sahifa
        </button>

        <div className="brand">
          <span>QURBONOV.UZ</span>
          <strong>Inglizcha lug‘atlar</strong>
        </div>

        <button type="button" className="vocabButton" onClick={() => router.push("/vocabulary")}>
          English Vocabulary
        </button>
      </header>

      <section className="dictionaryPanel">
        <div className="floatingTitle">Inglizcha lug‘atlar</div>

        <div className="intro">
          <strong>Kerakli lug‘atni tanlang</strong>
          <p>
            So‘z ma’nosi, sinonim, antonim, phrasal verb, irregular verb va akademik so‘zlarni
            alohida bo‘limlarda tez topishingiz mumkin.
          </p>
        </div>

        <div className="grid">
          {DICTIONARIES.map((item) => (
            <article key={item.href} className="card">
              <div className="badge">{item.badge}</div>

              <div className="cardText">
                <h2>{item.title}</h2>
                <p>{item.subtitle}</p>
              </div>

              <button type="button" className="openButton" onClick={() => router.push(item.href)}>
                Ochish
              </button>
            </article>
          ))}
        </div>
      </section>

      <style jsx>{`
        :global(*) { box-sizing: border-box; }
        :global(body) { margin: 0; }

        .page {
          min-height: 100vh;
          padding: 26px 18px 70px;
          font-family: "Bell MT", "Times New Roman", serif;
          color: #111820;
          background:
            radial-gradient(circle at top, rgba(120,196,235,.18), transparent 28%),
            linear-gradient(180deg,#eef3f6 0%,#dfe6ea 50%,#eef2f4 100%);
        }

        .topbar {
          width: min(1450px,96%);
          margin: 0 auto 76px;
          padding: 18px 22px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 18px;
          border: 2px solid #2d373c;
          border-radius: 22px;
          background: linear-gradient(145deg,#737b80 0%,#555e63 48%,#3c4448 100%);
          box-shadow: 0 10px 0 #293237, 0 18px 30px rgba(0,0,0,.18),
            inset 0 3px 0 rgba(255,255,255,.36), inset 0 -7px 10px rgba(0,0,0,.2);
        }

        .brand {
          text-align: center;
          color: white;
          text-shadow: 0 2px 2px rgba(0,0,0,.42);
        }

        .brand span {
          display: block;
          margin-bottom: 3px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .brand strong { font-size: 29px; }

        .backButton, .vocabButton, .openButton {
          min-height: 48px;
          padding: 9px 18px;
          border-radius: 10px;
          font-family: inherit;
          font-weight: 900;
          cursor: pointer;
          transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
        }

        .backButton {
          border: 2px solid #626c71;
          color: #253039;
          background: linear-gradient(180deg,#fff 0%,#d3d6d8 58%,#adb3b6 100%);
          box-shadow: 0 5px 0 #515b60, inset 0 2px 0 rgba(255,255,255,.9);
        }

        .vocabButton, .openButton {
          border: 2px solid #174b69;
          color: #073b68;
          background: linear-gradient(180deg,#d9f5ff 0%,#85d0f2 55%,#57add8 100%);
          box-shadow: 0 5px 0 #174760, inset 0 2px 0 rgba(255,255,255,.84);
        }

        .backButton:hover, .vocabButton:hover, .openButton:hover {
          transform: translateY(-2px);
          filter: brightness(1.04);
        }

        .backButton:active, .vocabButton:active, .openButton:active {
          transform: translateY(3px);
        }

        .dictionaryPanel {
          position: relative;
          width: min(1450px,96%);
          margin: 0 auto;
          padding: 76px 34px 42px;
          border: 2px solid #303a3f;
          border-radius: 25px;
          background: linear-gradient(145deg,#6d757a 0%,#535b60 42%,#3c4448 100%);
          box-shadow: 0 11px 0 #293237, 0 20px 34px rgba(0,0,0,.22),
            inset 0 3px 0 rgba(255,255,255,.34), inset 0 -8px 14px rgba(0,0,0,.18);
        }

        .floatingTitle {
          position: absolute;
          top: -31px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 320px;
          padding: 13px 26px 15px;
          text-align: center;
          color: #073b68;
          font-size: 28px;
          font-weight: 900;
          border: 2px solid #174a68;
          border-radius: 13px;
          background: linear-gradient(180deg,#ddf7ff 0%,#87cef0 53%,#58acd7 100%);
          box-shadow: 0 7px 0 #174760, 0 12px 19px rgba(0,0,0,.2),
            inset 0 2px 0 rgba(255,255,255,.88);
        }

        .intro {
          margin-bottom: 28px;
          padding: 18px 20px;
          border: 2px solid #788991;
          border-radius: 15px;
          background: linear-gradient(180deg,#fff 0%,#edf1f3 100%);
          box-shadow: 0 5px 0 #596267, inset 0 2px 0 rgba(255,255,255,.95);
        }

        .intro strong {
          display: block;
          margin-bottom: 6px;
          color: #073b68;
          font-size: 19px;
        }

        .intro p {
          margin: 0;
          line-height: 1.5;
          font-size: 15px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 28px;
        }

        .card {
          min-height: 245px;
          padding: 30px 24px 25px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 2px solid #747d82;
          border-radius: 18px;
          background: linear-gradient(180deg,#f8f8f8 0%,#dadcde 62%,#c6c9cb 100%);
          box-shadow: 0 8px 0 #596267, 0 13px 18px rgba(0,0,0,.15),
            inset 0 4px 4px rgba(255,255,255,.95);
        }

        .badge {
          min-width: 65px;
          min-height: 47px;
          padding: 8px 12px;
          display: grid;
          place-items: center;
          margin-bottom: 14px;
          border: 2px solid #31566b;
          border-radius: 11px;
          color: #073b68;
          background: linear-gradient(180deg,#e5f9ff 0%,#8fcfeb 100%);
          box-shadow: 0 4px 0 #3d5e70, inset 0 2px 0 rgba(255,255,255,.9);
          font-weight: 900;
        }

        .cardText {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .card h2 {
          margin: 0 0 8px;
          font-size: 25px;
        }

        .card p {
          max-width: 330px;
          margin: 0;
          color: #4b565d;
          line-height: 1.4;
          font-size: 14px;
        }

        .openButton {
          width: min(190px,80%);
          margin-top: 20px;
        }

        @media (max-width:1050px) {
          .grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
          .topbar { grid-template-columns: 1fr; text-align: center; }
          .backButton, .vocabButton { width: 100%; }
        }

        @media (max-width:680px) {
          .page { padding-left: 10px; padding-right: 10px; }
          .grid { grid-template-columns: 1fr; }
          .dictionaryPanel { width: 100%; padding: 70px 16px 30px; }
          .floatingTitle { min-width: 250px; font-size: 23px; }
          .card { min-height: 220px; }
        }
      `}</style>
    </main>
  );
}

