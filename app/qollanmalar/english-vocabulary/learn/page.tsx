Bular tepada qotib turishadimi ?

mana shu joyini ham olib tashla. 
Hozir qarada, men adminni bossam, shu panel chiqyabti. 
to'liq kod ber ! Yuqoridagi sahifani ham tartibga keltie
qara admin so'zini bosganimdan keyin. shu sahifalar chiqsin. Agar men foydalanuvcgilarini bsoganimdan keyin narigi sahifaga o'tsin. Hozir adminni bosgandan u sahifaga to'gridan-to'g'ri o'tyabti
Вставленный текст(20260822-062115).txt
Документ
to'liq yangi kod ber 
nimaga bu xato deybati
Вставленный текст(20260822-063048).txt
Документ
o'chirishni bossam, shu yozuv chiqyabti nimaga ?
Вставленный текст(20260822-063931).txt
Документ
Вставленный текст(20260822-064608).txt
Документ
Вставленный текст(20260822-064656).txt
Документ
so'z chiqmayabtiku
Вставленный текст(20260822-070520).txt
Документ
Вставленный текст(20260822-070644).txt
Документ
Вставленный текст(20260822-070815).txt
Документ
Вставленный текст(20260822-070934).txt
Документ
Вставленный текст(20260822-071113).txt
Документ
Вставленный текст(20260822-071303).txt
Документ
Вставленный текст(20260822-071651).txt
Документ
Вставленный текст(20260822-072034).txt
Документ
barbir chiqmadi
Вставленный текст(20260822-073809).txt
Документ
SHUNI O'CHIRISH KKMI ?
qandaydir manash saytda lug'atlar bittada saqlanmayabti
Вставленный текст(20260822-102139).txt
Документ
Вставленный текст(20260822-102300).txt
Документ
O'zi shu saytni o'zini ham 3d format qilib tartibga keltiraylik. Och kulrang ko'k ramglar bilar. 3d FORMATDA
Редактировать
BLEE NIMA BU EE ? o'ZIMIZNI SAYT QNADAY EDI SHUNGA MOS QIL ! 
ADmin tugmasi ishlamayabti. 
Mana shu dizynga mos qil ! Yiban ! 
Hozir mana shunday ko'rinishda saqlangan. 
Вставленный текст(20260822-122013).txt
Документ
Mana shu tepadagi 3ta tugmani yana qaerga qo'yish mumkin. Uyerda sal ga'ati turibti
Mana shu tugmalarni ham bosganda ko'k bo'ladigan qilish kerakda. qaysi unitni ishlaganligini bilishi uchun
ee dalbayob buzib qo'yding. Men shunchai ishlayotgan uniti kok bo'lsin dedim. Belgi qo'y demadimku.
Вставленный текст(20260822-125229).txt
Документ
Kirmayabtiku bu testga ?
qara bir qanday xunik qilib qo'yding bleeee
qani yana shu ahvolku
Bizni saytni qara, u bo'lim ham shunga mos bo'lsin
Анализ приостановлен

Ha, endi rasm bo‘yicha aniq qildim. Bu versiya siz yuborgan ko‘rinishga mos: tepada Asosiy sahifa, markazda English Vocabulary, pastda to‘q kulrang 3D Book tanlash paneli, undan keyin Book N + Unit 1–30 bloki.

To‘liq kodni yuklab ol

Buni:

app/qollanmalar/english-vocabulary/page.tsx

ga qo‘y.

Muhimi, learn/page.tsxga tegmaysan. Unit bosilganda shu mavjud testga o‘tadi. 

english-vocabulary-exact-reference.tsx
Код
eee dalbayob tushun sen. English Vocabulary ochganda. chiqadigan oinani ushbu saytga moslat ! Keyin test kitoblari chiqsin. masalan 1-kitobni bossam, 30 unit chiqsin. 1-unitni tansam oldingidek. shakillar bo'lsin

Endi aynan tushundim: English Vocabulary ochilganda alohida chiroyli 3D sahifa chiqadi, u asosiy saytdagi Qo‘llanmalar blokining dizayniga mos bo‘ladi.

Keyin Book 1–6 chiqadi. Masalan, Book 1ni bossang, faqat Book 1 uchun 30 ta Unit chiqadi. Unit 1ni bossang esa oldingi test sahifangga:

/qollanmalar/english-vocabulary/learn?book=1&unit=1

o‘tadi. learn/page.tsxga umuman tegilmaydi.

To‘liq moslashtirilgan page.tsx kodini yuklab ol

Buni aynan:

app/qollanmalar/english-vocabulary/page.tsx

ga qo‘y. 

english-vocabulary-final-site-matched.tsx
Код

Библиотека
/
english-vocabulary-final-site-matched.tsx
"use client";

import { useState } from "react";

const BOOKS = [1, 2, 3, 4, 5, 6];
const UNITS = Array.from({ length: 30 }, (_, i) => i + 1);

export default function EnglishVocabularyPage() {
  const [selectedBook, setSelectedBook] = useState<number | null>(null);

  function goBack() {
    window.location.href = "/qollanmalar";
  }

  function openUnit(unit: number) {
    if (!selectedBook) return;

    window.location.href =
      `/qollanmalar/english-vocabulary/learn?book=${selectedBook}&unit=${unit}`;
  }

  return (
    <main className="page">
      <div className="shell">
        <button
          type="button"
          className="backButton"
          onClick={goBack}
        >
          ← Qo‘llanmalar
        </button>

        <section className="mainPanel">
          <div className="floatingTitle">
            English Vocabulary
          </div>

          <div className="intro">
            <h1>4000 Essential English Words</h1>
            <p>Kitobni tanlang</p>
          </div>

          <div className="bookGrid">
            {BOOKS.map((book) => (
              <button
                key={book}
                type="button"
                className={
                  selectedBook === book
                    ? "bookCard bookCardActive"
                    : "bookCard"
                }
                onClick={() => setSelectedBook(book)}
              >
                <span className="bookName">Book {book}</span>
                <span className="bookSub">30 ta Unit</span>
              </button>
            ))}
          </div>
        </section>

        {selectedBook && (
          <section className="unitPanel">
            <div className="floatingTitle unitFloatingTitle">
              Book {selectedBook}
            </div>

            <div className="unitIntro">
              <h2>Unitni tanlang</h2>
              <p>
                Book {selectedBook} bo‘yicha 30 ta Unit
              </p>
            </div>

            <div className="unitGrid">
              {UNITS.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className="unitButton"
                  onClick={() => openUnit(unit)}
                >
                  Unit {unit}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 24px 18px 70px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f5f7f8 60%,
              #e9edef 100%
            );
          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
          color: #111;
        }

        .shell {
          width: min(1200px, 96%);
          margin: 0 auto;
        }

        .backButton {
          min-width: 150px;
          min-height: 44px;
          padding: 8px 16px;

          border: 2px solid #174461;
          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #a8e7ff 0%,
              #72c3eb 55%,
              #4b9dcd 100%
            );

          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.8),
            inset 0 -3px 3px rgba(0,0,0,.12),
            0 4px 0 #17415c,
            0 8px 10px rgba(0,0,0,.18);

          color: #073b68;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .backButton:hover {
          transform: translateY(-2px);
        }

        .backButton:active {
          transform: translateY(3px);
          box-shadow:
            inset 0 4px 5px rgba(0,0,0,.10),
            0 1px 0 #17415c;
        }

        .mainPanel,
        .unitPanel {
          position: relative;
          margin-top: 76px;
          padding: 70px 30px 34px;

          border: 3px solid #333a3e;
          border-radius: 23px;

          background:
            linear-gradient(
              180deg,
              #62686b 0%,
              #505659 46%,
              #3d4346 100%
            );

          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.10),
            inset 0 -7px 7px rgba(0,0,0,.22),
            0 6px 0 #30373b,
            0 11px 0 #242a2d,
            0 17px 24px rgba(0,0,0,.22);
        }

        .unitPanel {
          margin-top: 82px;
          padding-top: 64px;
        }

        .floatingTitle {
          position: absolute;
          left: 50%;
          top: -31px;
          transform: translateX(-50%);

          min-width: 340px;
          min-height: 58px;
          padding: 10px 28px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 3px solid #174461;
          border-radius: 12px;

          background:
            linear-gradient(
              180deg,
              #a9e7ff 0%,
              #75c5ed 47%,
              #4a9dce 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.70),
            inset 0 -5px 5px rgba(0,0,0,.13),
            0 6px 0 #17415c,
            0 10px 13px rgba(20,65,92,.24);

          color: #073b68;
          font-size: 30px;
          font-weight: 700;
          text-align: center;
          white-space: nowrap;
        }

        .unitFloatingTitle {
          min-width: 250px;
          font-size: 27px;
        }

        .intro,
        .unitIntro {
          text-align: center;
          margin-bottom: 30px;
        }

        .intro h1,
        .unitIntro h2 {
          margin: 0;
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
          text-shadow:
            0 2px 0 rgba(0,0,0,.35);
        }

        .intro p,
        .unitIntro p {
          margin: 7px 0 0;
          color: #e7eaec;
          font-size: 16px;
          font-weight: 700;
        }

        .bookGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 26px;
        }

        .bookCard {
          min-height: 160px;
          padding: 18px 20px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;

          border: 2px solid #596166;
          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ededed 42%,
              #c8c8c8 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.95),
            inset 0 -5px 5px rgba(0,0,0,.10),
            0 6px 0 #596166,
            0 11px 12px rgba(0,0,0,.18);

          color: #111;
          font-family: inherit;
          cursor: pointer;

          transition:
            transform .10s ease,
            filter .10s ease,
            box-shadow .10s ease;
        }

        .bookCard:hover {
          transform: translateY(-3px);
          filter: brightness(1.035);
        }

        .bookCard:active {
          transform: translateY(4px);
        }

        .bookCardActive {
          color: #073b68;
          border-color: #174461;

          background:
            linear-gradient(
              180deg,
              #b7eaff 0%,
              #7ecdf2 43%,
              #4ba1d2 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.72),
            inset 0 -5px 5px rgba(0,0,0,.13),
            0 6px 0 #17415c,
            0 11px 14px rgba(20,65,92,.25);
        }

        .bookName {
          font-size: 28px;
          font-weight: 700;
        }

        .bookSub {
          font-size: 14px;
          font-weight: 700;
          opacity: .75;
        }

        .unitGrid {
          display: grid;
          grid-template-columns: repeat(8, minmax(0, 1fr));
          gap: 18px 14px;
        }

        .unitButton {
          min-height: 68px;
          padding: 12px 12px;
