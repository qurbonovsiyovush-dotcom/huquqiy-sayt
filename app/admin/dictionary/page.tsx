"use client";

import { useState } from "react";

export default function DictionaryAdminPage() {
  const [book, setBook] = useState("1");
  const [unit, setUnit] = useState("1");
  const [text, setText] = useState("");

  const books = Array.from({ length: 6 }, (_, i) => i + 1);
  const units = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* Sarlavha */}
        <div style={{ marginBottom: "30px" }}>
          <h1
            style={{
              fontSize: "32px",
              margin: "0 0 8px",
              color: "#172033",
            }}
          >
            English Vocabulary
          </h1>

          <p
            style={{
              margin: 0,
              color: "#667085",
              fontSize: "16px",
            }}
          >
            4000 Essential English Words — so‘zlarni boshqarish
          </p>
        </div>

        {/* Asosiy karta */}
        <div
          style={{
            background: "white",
            borderRadius: "18px",
            padding: "28px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            border: "1px solid #e8ecf3",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "24px",
              color: "#172033",
            }}
          >
            Unitga so‘z qo‘shish
          </h2>

          {/* Book va Unit */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            {/* BOOK */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  color: "#344054",
                }}
              >
                Book
              </label>

              <select
                value={book}
                onChange={(e) => setBook(e.target.value)}
                style={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "10px",
                  border: "1px solid #d0d5dd",
                  padding: "0 14px",
                  fontSize: "16px",
                  background: "white",
                  color: "#101828",
                }}
              >
                {books.map((number) => (
                  <option key={number} value={number}>
                    Book {number}
                  </option>
                ))}
              </select>
            </div>

            {/* UNIT */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  color: "#344054",
                }}
              >
                Unit
              </label>

              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "10px",
                  border: "1px solid #d0d5dd",
                  padding: "0 14px",
                  fontSize: "16px",
                  background: "white",
                  color: "#101828",
                }}
              >
                {units.map((number) => (
                  <option key={number} value={number}>
                    Unit {number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tanlangan joy */}
          <div
            style={{
              padding: "14px 18px",
              background: "#eef4ff",
              borderRadius: "10px",
              color: "#1849a9",
              fontWeight: 600,
              marginBottom: "24px",
            }}
          >
            Tanlandi: Book {book} → Unit {unit}
          </div>

          {/* Import maydoni */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
                color: "#344054",
              }}
            >
              So‘zlarni kiriting
            </label>

            <p
              style={{
                marginTop: 0,
                color: "#667085",
                fontSize: "14px",
              }}
            >
              Har bir qatorda: English | Uzbek
            </p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`abandon | tark etmoq
keen | juda qiziqqan
jealous | rashkchi
tact | odob bilan muomala qilish`}
              style={{
                width: "100%",
                minHeight: "280px",
                resize: "vertical",
                padding: "16px",
                boxSizing: "border-box",
                borderRadius: "12px",
                border: "1px solid #d0d5dd",
                fontSize: "16px",
                lineHeight: "1.7",
                outline: "none",
                color: "#101828",
                background: "#ffffff",
              }}
            />
          </div>

          {/* Pastki ma'lumot */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "15px",
              marginTop: "20px",
            }}
          >
            <div style={{ color: "#667085" }}>
              {
                text
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean).length
              }{" "}
              ta qator
            </div>

            <button
              type="button"
              onClick={() => {
                alert(
                  `Book ${book}, Unit ${unit}: ${
                    text
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean).length
                  } ta so‘z tayyor`
                );
              }}
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "13px 26px",
                background: "#155eef",
                color: "white",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Import qilish
            </button>
          </div>
        </div>

        {/* Kelajakdagi test haqida */}
        <div
          style={{
            marginTop: "24px",
            background: "#ffffff",
            border: "1px solid #e8ecf3",
            borderRadius: "16px",
            padding: "22px",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#172033",
            }}
          >
            Test formati
          </h3>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                fontWeight: 700,
                marginBottom: "18px",
              }}
            >
              abandon
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div
                style={{
                  border: "1px solid #d0d5dd",
                  borderRadius: "10px",
                  padding: "15px",
                }}
              >
                A) tark etmoq
              </div>

              <div
                style={{
                  border: "1px solid #d0d5dd",
                  borderRadius: "10px",
                  padding: "15px",
                }}
              >
                B) davom ettirmoq
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
