"use client";

import { useState } from "react";

export default function EnglishVocabularyPage() {
  const [selectedBook, setSelectedBook] = useState<number | null>(null);

  const books = Array.from({ length: 6 }, (_, i) => i + 1);
  const units = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background:
          "linear-gradient(180deg, #ffffff 0%, #f3f5f6 55%, #e5e8ea 100%)",
        fontFamily: '"Bell MT", "Times New Roman", serif',
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
          style={{
            marginBottom: "25px",
            padding: "11px 20px",
            borderRadius: "10px",
            border: "2px solid #174461",
            background:
              "linear-gradient(180deg, #b8ecff 0%, #58a8d7 100%)",
            color: "#073b68",
            fontWeight: 700,
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          ← Asosiy sahifa
        </button>

        <div
          style={{
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          <h1
            style={{
              margin: "0 0 10px",
              fontSize: "38px",
              color: "#073b68",
            }}
          >
            English Vocabulary
          </h1>

          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#344054",
            }}
          >
            4000 Essential English Words
          </div>

          <p
            style={{
              marginTop: "12px",
              color: "#667085",
              fontSize: "17px",
            }}
          >
            Avval Book tanlang, keyin Unitni tanlab testni boshlang.
          </p>
        </div>

        {/* BOOKS */}

        <section
          style={{
            background:
              "linear-gradient(145deg, #686c6f 0%, #505457 45%, #363a3d 100%)",
            border: "3px solid #303538",
            borderRadius: "28px",
            padding: "35px",
            boxShadow:
              "inset 0 7px 6px rgba(255,255,255,.23), 0 10px 20px rgba(0,0,0,.25)",
          }}
        >
          <h2
            style={{
              textAlign: "center",
              color: "white",
              fontSize: "28px",
              marginTop: 0,
              marginBottom: "30px",
            }}
          >
            Book tanlang
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
            }}
          >
            {books.map((book) => {
              const active = selectedBook === book;

              return (
                <button
                  key={book}
                  type="button"
                  onClick={() => {
                    setSelectedBook(book);
                  }}
                  style={{
                    minHeight: "120px",
                    borderRadius: "18px",
                    border: active
                      ? "3px solid #174461"
                      : "2px solid #3d4347",
                    background: active
                      ? "linear-gradient(180deg, #b8ecff 0%, #58a8d7 100%)"
                      : "linear-gradient(145deg, #e1e1e1 0%, #c5c5c5 50%, #a6a6a6 100%)",
                    boxShadow:
                      "inset 0 6px 5px rgba(255,255,255,.86), 0 6px 0 #4a5054",
                    fontSize: "25px",
                    fontWeight: 700,
                    color: active ? "#073b68" : "#111",
                    cursor: "pointer",
                  }}
                >
                  Book {book}
                </button>
              );
            })}
          </div>
        </section>

        {/* UNITS */}

        {selectedBook !== null && (
          <section
            style={{
              marginTop: "45px",
              background: "#ffffff",
              border: "2px solid #d0d5dd",
              borderRadius: "24px",
              padding: "30px",
              boxShadow: "0 10px 25px rgba(0,0,0,.08)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: "25px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 8px",
                  fontSize: "30px",
                  color: "#073b68",
                }}
              >
                Book {selectedBook}
              </h2>

              <div
                style={{
                  color: "#667085",
                  fontSize: "16px",
                }}
              >
                Unitni tanlang
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "14px",
              }}
            >
              {units.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => {
                    window.location.href =
                      `/qollanmalar/english-vocabulary/learn?book=${selectedBook}&unit=${unit}`;
                  }}
                  style={{
                    minHeight: "65px",
                    borderRadius: "12px",
                    border: "2px solid #4e565b",
                    background:
                      "linear-gradient(180deg, #f8f8f8 0%, #bdbdbd 100%)",
                    boxShadow:
                      "inset 0 4px 4px white, 0 4px 0 #555d61",
                    color: "#111",
                    fontSize: "17px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Unit {unit}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
