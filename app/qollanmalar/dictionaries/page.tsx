"use client";

import Link from "next/link";

export default function DictionariesPage() {
  const sections = [
    {
      title: "English–Uzbek Dictionary",
      icon: "EN",
      href: "/qollanmalar/dictionaries/english-uzbek",
    },
    {
      title: "Uzbek–English Dictionary",
      icon: "UZ",
      href: "/qollanmalar/dictionaries/uzbek-english",
    },
    {
      title: "Phrasal Verbs",
      icon: "PV",
      href: "/qollanmalar/dictionaries/phrasal-verbs",
    },
    {
      title: "Irregular Verbs",
      icon: "IV",
      href: "/qollanmalar/dictionaries/irregular-verbs",
    },
    {
      title: "Synonyms & Antonyms",
      icon: "S/A",
      href: "/qollanmalar/dictionaries/synonyms-antonyms",
    },
    {
      title: "Collocations",
      icon: "C",
      href: "/qollanmalar/dictionaries/collocations",
    },
  ];

  return (
    <main className="page">
      <section className="dictionaryPanel">
        <div className="titleBox">Inglizcha lug‘atlar</div>

        <div className="cards">
          {sections.map((section) => (
            <div className="card" key={section.title}>
              <div className="iconBox">{section.icon}</div>

              <h2>{section.title}</h2>

              <Link href={section.href} className="openButton">
                Ochish
              </Link>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .page {
          width: 100%;
          min-height: 100vh;
          padding: 45px 20px 70px;
          box-sizing: border-box;
          background:
            radial-gradient(
              circle at top,
              rgba(255, 255, 255, 0.95),
              rgba(226, 232, 236, 0.9)
            );
          font-family: "Bell MT", Georgia, serif;
        }

        .dictionaryPanel {
          position: relative;
          width: min(1160px, 100%);
          margin: 35px auto 0;
          padding: 95px 30px 40px;
          box-sizing: border-box;

          border: 3px solid #252d31;
          border-radius: 26px;

          background: linear-gradient(
            145deg,
            #747a7d 0%,
            #565c5f 45%,
            #3e4447 100%
          );

          box-shadow:
            0 10px 0 #252b2e,
            0 18px 30px rgba(0, 0, 0, 0.28),
            inset 0 2px 2px rgba(255, 255, 255, 0.45),
            inset 0 -6px 10px rgba(0, 0, 0, 0.25);
        }

        .titleBox {
          position: absolute;
          top: -34px;
          left: 50%;
          transform: translateX(-50%);

          min-width: 320px;
          padding: 15px 38px;

          text-align: center;
          font-size: 31px;
          font-weight: 700;
          color: #063f69;

          border: 2px solid #125b82;
          border-radius: 15px;

          background: linear-gradient(
            to bottom,
            #c7f0ff 0%,
            #8dd8f5 42%,
            #4fb5e4 75%,
            #3293c4 100%
          );

          box-shadow:
            0 7px 0 #145575,
            0 11px 17px rgba(0, 0, 0, 0.28),
            inset 0 2px 2px rgba(255, 255, 255, 0.9);
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 30px;
        }

        .card {
          min-height: 230px;
          padding: 25px 20px 24px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;

          box-sizing: border-box;

          border: 2px solid #f3f3f3;
          border-radius: 18px;

          background: linear-gradient(
            145deg,
            #ffffff 0%,
            #f3f3f3 40%,
            #d8d8d8 100%
          );

          box-shadow:
            0 8px 0 #41494d,
            0 14px 18px rgba(0, 0, 0, 0.23),
            inset 0 2px 3px rgba(255, 255, 255, 1);

          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .card:hover {
          transform: translateY(-4px);

          box-shadow:
            0 11px 0 #41494d,
            0 18px 22px rgba(0, 0, 0, 0.28),
            inset 0 2px 3px rgba(255, 255, 255, 1);
        }

        .iconBox {
          width: 58px;
          height: 48px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #064b76;
          font-size: 17px;
          font-weight: 700;

          border: 2px solid #1d607f;
          border-radius: 11px;

          background: linear-gradient(
            to bottom,
            #d7f5ff 0%,
            #8ed7f2 48%,
            #4baed7 100%
          );

          box-shadow:
            0 5px 0 #185471,
            0 8px 10px rgba(0, 0, 0, 0.18),
            inset 0 2px 2px rgba(255, 255, 255, 0.9);
        }

        .card h2 {
          margin: 22px 0;
          padding: 0;

          text-align: center;
          font-size: 24px;
          line-height: 1.2;
          font-weight: 700;
          color: #111;
        }

        .openButton {
          min-width: 150px;
          padding: 13px 25px;

          display: inline-flex;
          justify-content: center;
          align-items: center;

          box-sizing: border-box;

          text-decoration: none;
          color: #073f63;
          font-size: 17px;
          font-weight: 700;

          border: 2px solid #165c7e;
          border-radius: 10px;

          background: linear-gradient(
            to bottom,
            #d2f3ff 0%,
            #8cd7f4 42%,
            #4bb3e0 75%,
            #3394c4 100%
          );

          box-shadow:
            0 5px 0 #164d68,
            0 8px 10px rgba(0, 0, 0, 0.2),
            inset 0 2px 2px rgba(255, 255, 255, 0.9);

          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .openButton:hover {
          transform: translateY(-2px);

          box-shadow:
            0 7px 0 #164d68,
            0 10px 12px rgba(0, 0, 0, 0.23),
            inset 0 2px 2px rgba(255, 255, 255, 0.9);
        }

        .openButton:active {
          transform: translateY(3px);

          box-shadow:
            0 2px 0 #164d68,
            inset 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        @media (max-width: 950px) {
          .cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .page {
            padding-left: 12px;
            padding-right: 12px;
          }

          .dictionaryPanel {
            padding: 80px 16px 28px;
          }

          .cards {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .titleBox {
            min-width: 230px;
            padding: 13px 25px;
            font-size: 25px;
          }

          .card {
            min-height: 210px;
          }
        }
      `}</style>
    </main>
  );
}
