"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type UserRole = "admin" | "user" | null;

export default function QoidalarKorishPage() {
  const params = useParams<{ id: string }>();

  const id =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRole();
  }, []);

  async function loadRole() {
    try {
      const response = await fetch("/api/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      const data = await response.json();

      setRole(
        data?.role === "admin"
          ? "admin"
          : "user"
      );
    } catch {
      setRole("user");
    } finally {
      setLoading(false);
    }
  }

  const pdfUrl =
    `/api/kazuslar/qoidalar/fayl?id=${encodeURIComponent(id)}` +
    "#toolbar=0&navpanes=0&scrollbar=1&view=FitH";

  return (
    <main
      className="page"
      onContextMenu={(event) => {
        if (role !== "admin") {
          event.preventDefault();
        }
      }}
      onDragStart={(event) => {
        if (role !== "admin") {
          event.preventDefault();
        }
      }}
      onKeyDown={(event) => {
        if (role === "admin") return;

        const key = event.key.toLowerCase();

        if (
          (event.ctrlKey || event.metaKey) &&
          ["s", "p", "u"].includes(key)
        ) {
          event.preventDefault();
        }
      }}
    >
      <header className="topBar">
        <button
          type="button"
          className="backButton"
          onClick={() => {
            window.location.href =
              "/talabalar/kazuslar/qoidalar";
          }}
        >
          Orqaga
        </button>

        <div className="title">
          Materialni ko‘rish
        </div>

        {!loading && role === "admin" ? (
          <button
            type="button"
            className="adminDownloadButton"
            onClick={() => {
              window.open(
                `/api/kazuslar/qoidalar/fayl?id=${encodeURIComponent(id)}&download=1`,
                "_blank",
                "noopener,noreferrer"
              );
            }}
          >
            Admin: yuklab olish
          </button>
        ) : (
          <div className="viewOnlyBadge">
            Faqat ko‘rish
          </div>
        )}
      </header>

      <section className="viewerShell">
        {!id ? (
          <div className="errorBox">
            Material ID topilmadi.
          </div>
        ) : (
          <iframe
            className="pdfFrame"
            src={pdfUrl}
            title="Kazusga javob yozish qoidalari"
            allow="fullscreen"
          />
        )}
      </section>

      <div className="notice">
        Material faqat o‘qish uchun taqdim etilgan.
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #e9ecef;
          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
          overflow-x: hidden;
        }

        .topBar {
          position: sticky;
          top: 0;
          z-index: 20;
          width: 100%;
          min-height: 68px;
          padding: 9px 16px;
          display: grid;
          grid-template-columns:
            minmax(120px, auto)
            1fr
            minmax(140px, auto);
          align-items: center;
          gap: 12px;
          background:
            linear-gradient(
              #f7f7f7,
              #d8d8d8
            );
          border-bottom:
            2px solid #51585c;
          box-shadow:
            0 3px 8px
            rgba(0,0,0,.16);
        }

        .title {
          text-align: center;
          color: #073b68;
          font-size: 22px;
          font-weight: 700;
        }

        .backButton,
        .adminDownloadButton {
          min-height: 42px;
          padding: 7px 14px;
          border-radius: 9px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
        }

        .backButton {
          border: 2px solid #555d62;
          background:
            linear-gradient(
              #fafafa,
              #bababa
            );
        }

        .adminDownloadButton {
          color: #073b68;
          border:
            2px solid #174461;
          background:
            linear-gradient(
              #c9efff,
              #65b6df
            );
        }

        .viewOnlyBadge {
          justify-self: end;
          padding: 8px 14px;
          border-radius: 999px;
          color: #073b68;
          font-weight: 700;
          background: #d9effc;
        }

        .viewerShell {
          width: 100%;
          min-height:
            calc(100vh - 115px);
          padding: 8px;
          background: #fff;
        }

        .pdfFrame {
          display: block;
          width: 100%;
          height:
            calc(100vh - 125px);
          border: 0;
          background: #fff;
        }

        .notice {
          position: fixed;
          right: 14px;
          bottom: 12px;
          z-index: 30;
          padding: 7px 11px;
          border-radius: 8px;
          pointer-events: none;
          color: rgba(0,0,0,.55);
          background:
            rgba(255,255,255,.72);
          font-size: 12px;
        }

        .errorBox {
          margin: 30px auto;
          padding: 20px;
          max-width: 700px;
          text-align: center;
          border-radius: 10px;
          background: #fff;
          color: #8b2222;
          font-weight: 700;
        }

        @media (max-width: 600px) {
          .topBar {
            min-height: 52px;
            padding: 5px 6px;
            grid-template-columns:
              auto 1fr auto;
            gap: 5px;
          }

          .title {
            font-size: 14px;
          }

          .backButton,
          .adminDownloadButton {
            min-height: 34px;
            padding: 4px 7px;
            font-size: 10px;
          }

          .viewOnlyBadge {
            padding: 5px 7px;
            font-size: 9px;
          }

          .viewerShell {
            padding: 0;
            min-height:
              calc(100vh - 52px);
          }

          .pdfFrame {
            height:
              calc(100vh - 52px);
          }

          .notice {
            right: 5px;
            bottom: 5px;
            font-size: 9px;
          }
        }
      `}</style>
    </main>
  );
}
