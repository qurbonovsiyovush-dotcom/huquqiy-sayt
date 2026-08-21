"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [messageType, setMessageType] =
    useState<"error" | "success" | "">("");

  useEffect(() => {
    /*
      Login sahifasi ochilganda
      oldingi xabarni tozalaymiz.
    */
    setMessage("");
    setMessageType("");
  }, []);

  async function login(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanCode = code
      .trim()
      .toUpperCase();

    if (!cleanCode) {
      setMessage(
        "Maxsus kirish kodini kiriting."
      );
      setMessageType("error");
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        "/api/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            code: cleanCode,
          }),
        }
      );

      let data: {
        success?: boolean;
        error?: string;
        message?: string;
        redirect?: string;
        role?: string;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || !data.success) {
        setMessage(
          data.error ||
            data.message ||
            "Kirish amalga oshmadi."
        );

        setMessageType("error");
        return;
      }

      setMessage("Kirish muvaffaqiyatli.");
      setMessageType("success");

      /*
        Proxy /login?next=...
        qilib yuborgan bo‘lsa,
        o‘sha sahifaga qaytaramiz.
      */

      const params =
        new URLSearchParams(
          window.location.search
        );

      const next =
        params.get("next");

      const safeNext =
        next &&
        next.startsWith("/") &&
        !next.startsWith("//")
          ? next
          : null;

      const redirectTo =
        safeNext ||
        data.redirect ||
        "/";

      window.setTimeout(() => {
        window.location.replace(
          redirectTo
        );
      }, 250);
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      setMessage(
        "Server bilan bog‘lanishda xatolik yuz berdi."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="loginPage">
      <div className="backgroundGlow glowOne" />
      <div className="backgroundGlow glowTwo" />

      <section className="loginCard">
        <div className="innerFrame">

          {/* ISM */}

          <div className="namePlate">
            <span>
              Qurbonov Siyovush
            </span>

            <span>
              Jamaliddinzoda
            </span>
          </div>

          {/* LOGIN */}

          <form
            className="loginForm"
            onSubmit={login}
          >
            <div className="loginTitle">
              Maxsus kirish kodi
            </div>

            <label
              className="inputBox"
              htmlFor="access-code"
            >
              <span className="keyIcon">
                ◆
              </span>

              <input
                id="access-code"
                type="text"
                value={code}
                onChange={(event) => {
                  setCode(
                    event.target.value
                  );

                  if (message) {
                    setMessage("");
                    setMessageType("");
                  }
                }}
                placeholder="Kirish kodini kiriting"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={80}
                disabled={loading}
              />
            </label>

            {message && (
              <div
                className={`message ${
                  messageType ===
                  "success"
                    ? "successMessage"
                    : "errorMessage"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="loginButton"
              disabled={loading}
            >
              <span>
                {loading
                  ? "Kutilmoqda..."
                  : "Kirish"}
              </span>
            </button>
          </form>

          {/* PASTKI IZOH */}

          <div className="infoArea">
            <div className="infoLine" />

            <p>
              Platformaga faqat
              administrator tomonidan
              berilgan maxsus kod orqali
              kirish mumkin.
            </p>
          </div>
        </div>
      </section>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .loginPage {
          position: relative;

          width: 100%;
          min-height: 100svh;

          display: flex;
          align-items: center;
          justify-content: center;

          overflow: hidden;

          padding: 24px;

          background:
            radial-gradient(
              circle at 50% 18%,
              rgba(21, 125, 177, .30),
              transparent 38%
            ),
            linear-gradient(
              180deg,
              #0a4669 0%,
              #043754 35%,
              #022b42 70%,
              #011f31 100%
            );

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        .backgroundGlow {
          position: absolute;
          pointer-events: none;

          border-radius: 50%;

          filter: blur(50px);

          opacity: .3;
        }

        .glowOne {
          width: 300px;
          height: 300px;

          top: -100px;
          left: -100px;

          background: #41c9ff;
        }

        .glowTwo {
          width: 270px;
          height: 270px;

          right: -110px;
          bottom: -100px;

          background: #005d88;
        }

        .loginCard {
          position: relative;
          z-index: 2;

          width:
            min(
              470px,
              100%
            );

          padding: 2px;

          border: 1px solid
            rgba(
              107,
              216,
              255,
              .68
            );

          border-radius: 30px;

          background:
            linear-gradient(
              145deg,
              rgba(
                106,
                214,
                255,
                .18
              ),
              rgba(
                0,
                54,
                80,
                .28
              )
            );

          box-shadow:
            inset 0 1px 0
              rgba(255,255,255,.24),
            0 22px 55px
              rgba(0,0,0,.35);
        }

        .innerFrame {
          padding:
            38px
            30px
            28px;

          border-radius: 27px;

          background:
            linear-gradient(
              180deg,
              rgba(
                2,
                55,
                82,
                .88
              ),
              rgba(
                0,
                37,
                57,
                .92
              )
            );
        }

        /* =====================
           ISM PANELI
        ===================== */

        .namePlate {
          width: 100%;

          min-height: 115px;

          padding:
            16px
            20px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 2px;

          border:
            3px solid
            #575f64;

          border-radius: 22px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ededed 28%,
              #cfcfcf 63%,
              #a8aaab 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255,255,255,.95),
            inset 0 -7px 8px
              rgba(0,0,0,.18),
            0 8px 0
              #26343b,
            0 15px 22px
              rgba(0,0,0,.34);

          color: #073b5b;

          text-align: center;

          font-size: 28px;
          font-weight: 700;
          line-height: 1.16;

          text-shadow:
            0 2px 0
              rgba(255,255,255,.8);
        }

        /* =====================
           FORM
        ===================== */

        .loginForm {
          margin-top: 46px;
        }

        .loginTitle {
          margin-bottom: 18px;

          color: white;

          text-align: center;

          font-size: 25px;
          font-weight: 700;

          text-shadow:
            0 3px 5px
              rgba(0,0,0,.42);
        }

        /* =====================
           INPUT
        ===================== */

        .inputBox {
          width: 100%;
          height: 64px;

          padding:
            0
            18px;

          display: flex;
          align-items: center;

          gap: 14px;

          overflow: hidden;

          border:
            2px solid
            #6ed8ff;

          border-radius: 18px;

          background:
            linear-gradient(
              180deg,
              rgba(
                0,
                45,
                69,
                .82
              ),
              rgba(
                0,
                34,
                53,
                .92
              )
            );

          box-shadow:
            inset 0 4px 8px
              rgba(0,0,0,.34),
            inset 0 1px 0
              rgba(255,255,255,.12),
            0 4px 12px
              rgba(0,0,0,.20);
        }

        .inputBox:focus-within {
          border-color: #b9efff;

          box-shadow:
            inset 0 4px 8px
              rgba(0,0,0,.34),
            0 0 0 3px
              rgba(
                71,
                197,
                245,
                .16
              ),
            0 5px 16px
              rgba(0,0,0,.23);
        }

        .keyIcon {
          flex: 0 0 auto;

          color: #ffc83d;

          font-size: 19px;

          text-shadow:
            0 2px 4px
              rgba(0,0,0,.45);
        }

        .inputBox input {
          width: 100%;
          min-width: 0;

          border: none;
          outline: none;

          background:
            transparent;

          color: white;

          font-family: inherit;
          font-size: 18px;

          text-transform:
            uppercase;
        }

        .inputBox input::placeholder {
          color:
            rgba(
              218,
              230,
              237,
              .55
            );

          text-transform: none;
        }

        /* =====================
           XABAR
        ===================== */

        .message {
          margin-top: 13px;
          padding:
            10px
            12px;

          border-radius: 10px;

          text-align: center;

          font-family:
            Arial,
            sans-serif;

          font-size: 13px;
          line-height: 1.35;
        }

        .errorMessage {
          border:
            1px solid
            rgba(
              255,
              119,
              119,
              .65
            );

          background:
            rgba(
              125,
              15,
              15,
              .35
            );

          color: #ffd5d5;
        }

        .successMessage {
          border:
            1px solid
            rgba(
              108,
              229,
              158,
              .65
            );

          background:
            rgba(
              16,
              105,
              55,
              .33
            );

          color: #d7ffe7;
        }

        /* =====================
           KIRISH TUGMASI
        ===================== */

        .loginButton {
          position: relative;

          width: 100%;
          height: 64px;

          margin-top: 20px;

          border:
            2px solid
            #75dcff;

          border-radius: 18px;

          background:
            linear-gradient(
              180deg,
              #64d7ff 0%,
              #26b9ed 45%,
              #0788c1 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.55),
            inset 0 -6px 7px
              rgba(0,62,96,.28),
            0 7px 0
              #035d85,
            0 13px 20px
              rgba(0,0,0,.30);

          color: white;

          font-family: inherit;
          font-size: 27px;
          font-weight: 700;

          text-shadow:
            0 2px 3px
              rgba(0,0,0,.28);

          cursor: pointer;

          transition:
            transform .12s ease,
            box-shadow .12s ease,
            filter .12s ease;
        }

        .loginButton:hover {
          filter:
            brightness(1.05);
        }

        .loginButton:active {
          transform:
            translateY(5px);

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.45),
            inset 0 -4px 6px
              rgba(0,62,96,.24),
            0 2px 0
              #035d85,
            0 7px 12px
              rgba(0,0,0,.24);
        }

        .loginButton:disabled {
          opacity: .7;
          cursor: wait;
        }

        /* =====================
           IZOH
        ===================== */

        .infoArea {
          margin-top: 38px;
        }

        .infoLine {
          width: 100%;
          height: 1px;

          margin-bottom: 21px;

          background:
            rgba(
              177,
              224,
              244,
              .25
            );
        }

        .infoArea p {
          max-width: 345px;

          margin:
            0
            auto;

          color:
            rgba(
              222,
              235,
              241,
              .76
            );

          text-align: center;

          font-size: 15px;
          line-height: 1.55;
        }

        /* =====================
           PLANSHET
        ===================== */

        @media (
          max-width: 700px
        ) {
          .loginPage {
            padding: 14px;
          }

          .loginCard {
            width:
              min(
                430px,
                100%
              );

            border-radius: 24px;
          }

          .innerFrame {
            padding:
              26px
              22px
              22px;

            border-radius: 21px;
          }

          .namePlate {
            min-height: 91px;

            padding:
              12px
              15px;

            border-radius: 17px;

            font-size: 23px;
          }

          .loginForm {
            margin-top: 34px;
          }

          .loginTitle {
            margin-bottom: 14px;

            font-size: 22px;
          }

          .inputBox {
            height: 57px;

            border-radius: 15px;
          }

          .inputBox input {
            font-size: 16px;
          }

          .loginButton {
            height: 57px;

            margin-top: 17px;

            border-radius: 15px;

            font-size: 23px;
          }

          .infoArea {
            margin-top: 29px;
          }

          .infoLine {
            margin-bottom: 16px;
          }

          .infoArea p {
            font-size: 14px;
          }
        }

        /* =====================
           TELEFON
        ===================== */

        @media (
          max-width: 480px
        ) {
          .loginPage {
            min-height: 100svh;

            padding:
              10px
              12px;
          }

          .loginCard {
            width: 100%;

            border-radius: 21px;
          }

          .innerFrame {
            padding:
              21px
              17px
              18px;

            border-radius: 19px;
          }

          .namePlate {
            min-height: 76px;

            padding:
              10px
              10px;

            border-width: 2px;
            border-radius: 14px;

            box-shadow:
              inset 0 5px 5px
                rgba(
                  255,
                  255,
                  255,
                  .95
                ),
              inset 0 -5px 5px
                rgba(
                  0,
                  0,
                  0,
                  .17
                ),
              0 5px 0
                #26343b,
              0 10px 15px
                rgba(
                  0,
                  0,
                  0,
                  .28
                );

            font-size:
              clamp(
                20px,
                6vw,
                24px
              );

            line-height: 1.08;
          }

          .loginForm {
            margin-top: 27px;
          }

          .loginTitle {
            margin-bottom: 12px;

            font-size: 20px;
          }

          .inputBox {
            height: 52px;

            padding:
              0
              14px;

            gap: 10px;

            border-radius: 14px;
          }

          .keyIcon {
            font-size: 16px;
          }

          .inputBox input {
            font-size: 15px;
          }

          .loginButton {
            height: 52px;

            margin-top: 15px;

            border-radius: 14px;

            font-size: 21px;

            box-shadow:
              inset 0 5px 4px
                rgba(
                  255,
                  255,
                  255,
                  .55
                ),
              inset 0 -5px 5px
                rgba(
                  0,
                  62,
                  96,
                  .26
                ),
              0 5px 0
                #035d85,
              0 9px 14px
                rgba(
                  0,
                  0,
                  0,
                  .27
                );
          }

          .infoArea {
            margin-top: 25px;
          }

          .infoLine {
            margin-bottom: 14px;
          }

          .infoArea p {
            max-width: 280px;

            font-size: 13px;
            line-height: 1.45;
          }
        }

        /* =====================
           JUDA KICHIK TELEFON
        ===================== */

        @media (
          max-width: 360px
        ) {
          .loginPage {
            padding: 7px;
          }

          .innerFrame {
            padding:
              17px
              13px
              15px;
          }

          .namePlate {
            min-height: 68px;

            font-size: 19px;
          }

          .loginForm {
            margin-top: 22px;
          }

          .loginTitle {
            font-size: 18px;
          }

          .inputBox,
          .loginButton {
            height: 48px;
          }

          .loginButton {
            font-size: 19px;
          }

          .infoArea {
            margin-top: 21px;
          }

          .infoArea p {
            font-size: 12px;
          }
        }
      `}</style>
    </main>
  );
}
