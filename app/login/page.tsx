"use client";

import {
  FormEvent,
  useState,
} from "react";

export default function LoginPage() {
  const [code, setCode] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<
      "error" | "success" | ""
    >("");

  async function login(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanCode =
      code.trim().toUpperCase();

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
      const response =
        await fetch(
          "/api/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                code: cleanCode,
              }),
          }
        );

      let data: {
        success?: boolean;
        error?: string;
        message?: string;
        redirect?: string;
      } = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok ||
        !data.success
      ) {
        setMessage(
          data.error ||
            data.message ||
            "Kirish amalga oshmadi."
        );

        setMessageType("error");

        return;
      }

      setMessage(
        "Kirish muvaffaqiyatli."
      );

      setMessageType(
        "success"
      );

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

      window.setTimeout(
        () => {
          window.location.replace(
            redirectTo
          );
        },
        250
      );
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      setMessage(
        "Server bilan bog‘lanishda xatolik yuz berdi."
      );

      setMessageType(
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">

      <section className="loginShell">

        <div className="floatingTitle">
          Maxsus kirish
        </div>

        <div className="loginCard">

          <div className="namePlate">
            <span>
              Qurbonov Siyovush
            </span>

            <span>
              Jamaliddinzoda
            </span>
          </div>

          <form
            className="form"
            onSubmit={login}
          >

            <div className="formTitle">
              Maxsus kirish kodi
            </div>

            <input
              className="codeInput"
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
              {loading
                ? "Kutilmoqda..."
                : "Kirish"}
            </button>

          </form>

          <div className="infoBox">
            Platformaga faqat
            administrator tomonidan
            berilgan maxsus kod orqali
            kirish mumkin.
          </div>

        </div>
      </section>

      <style jsx>{`

        * {
          box-sizing:
            border-box;
        }

        .page {
          width: 100%;

          min-height:
            100svh;

          display: flex;

          align-items:
            center;

          justify-content:
            center;

          padding:
            70px 18px
            45px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f3f5f6 55%,
              #e5e8ea 100%
            );

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          color: #111;
        }

        /* =====================
           TASHQI PANEL
        ===================== */

        .loginShell {
          position:
            relative;

          width:
            min(
              720px,
              94%
            );

          padding:
            85px
            42px
            42px;

          border:
            3px solid
            #303538;

          border-radius:
            30px;

          background:
            linear-gradient(
              145deg,
              #686c6f 0%,
              #505457 45%,
              #363a3d 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                .23
              ),

            inset 0 -8px 8px
              rgba(
                0,
                0,
                0,
                .32
              ),

            0 7px 0
              #272b2e,

            0 15px 24px
              rgba(
                0,
                0,
                0,
                .30
              );
        }

        /* =====================
           KO‘K NOM PANELI
        ===================== */

        .floatingTitle {
          position:
            absolute;

          top: -36px;

          left: 50%;

          transform:
            translateX(-50%);

          width:
            min(
              360px,
              80%
            );

          min-height:
            70px;

          display: flex;

          align-items:
            center;

          justify-content:
            center;

          padding:
            10px 22px;

          border:
            3px solid
            #174461;

          border-radius:
            17px;

          background:
            linear-gradient(
              180deg,
              #9bd9ff 0%,
              #73bdea 45%,
              #4e9ccc 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                .75
              ),

            inset 0 -6px 6px
              rgba(
                0,
                0,
                0,
                .16
              ),

            0 5px 0
              #17415c,

            0 9px 13px
              rgba(
                0,
                0,
                0,
                .25
              );

          color: #073b68;

          text-align:
            center;

          font-size:
            30px;

          font-weight:
            700;

          text-shadow:
            0 2px 0
            rgba(
              255,
              255,
              255,
              .7
            );
        }

        /* =====================
           ICHKI KARTA
        ===================== */

        .loginCard {
          width: 100%;

          padding:
            34px;

          border:
            2px solid
            #3d4347;

          border-radius:
            22px;

          background:
            linear-gradient(
              145deg,
              #e1e1e1 0%,
              #c5c5c5 50%,
              #a6a6a6 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                .86
              ),

            inset 0 -7px 7px
              rgba(
                0,
                0,
                0,
                .18
              ),

            0 6px 0
              #4a5054,

            0 11px 16px
              rgba(
                0,
                0,
                0,
                .25
              );
        }

        /* =====================
           ISM PANELI
        ===================== */

        .namePlate {
          width: 100%;

          min-height:
            105px;

          padding:
            16px 20px;

          display: flex;

          flex-direction:
            column;

          align-items:
            center;

          justify-content:
            center;

          gap: 2px;

          border:
            3px solid
            #42494e;

          border-radius:
            16px;

          background:
            linear-gradient(
              180deg,
              #f7f7f7 0%,
              #dedede 30%,
              #b9b9b9 70%,
              #9f9f9f 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                .95
              ),

            inset 0 -6px 6px
              rgba(
                0,
                0,
                0,
                .20
              ),

            0 5px 0
              #4b5256,

            0 9px 11px
              rgba(
                0,
                0,
                0,
                .23
              );

          color: #111;

          text-align:
            center;

          font-size:
            29px;

          font-weight:
            700;

          line-height:
            1.12;
        }

        /* =====================
           FORM
        ===================== */

        .form {
          margin-top:
            38px;
        }

        .formTitle {
          margin-bottom:
            17px;

          color: #111;

          text-align:
            center;

          font-size:
            25px;

          font-weight:
            700;
        }

        /* =====================
           INPUT
        ===================== */

        .codeInput {
          width: 100%;

          height:
            64px;

          padding:
            0 18px;

          border:
            3px solid
            #174461;

          border-radius:
            14px;

          outline: none;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #e6e6e6 45%,
              #cfcfcf 100%
            );

          box-shadow:
            inset 0 5px 5px
              rgba(
                255,
                255,
                255,
                .94
              ),

            inset 0 -4px 5px
              rgba(
                0,
                0,
                0,
                .14
              ),

            0 4px 0
              #555d61,

            0 8px 10px
              rgba(
                0,
                0,
                0,
                .17
              );

          color: #111;

          font-family:
            inherit;

          font-size:
            18px;

          text-transform:
            uppercase;

          transition:
            border-color
            .15s ease,

            box-shadow
            .15s ease;
        }

        .codeInput:focus {
          border-color:
            #2b9fd5;

          box-shadow:
            inset 0 5px 5px
              rgba(
                255,
                255,
                255,
                .94
              ),

            inset 0 -4px 5px
              rgba(
                0,
                0,
                0,
                .14
              ),

            0 4px 0
              #17415c,

            0 0 0 3px
              rgba(
                78,
                156,
                204,
                .16
              );
        }

        .codeInput::placeholder {
          color:
            #666;

          text-transform:
            none;
        }

        /* =====================
           KIRISH TUGMASI
        ===================== */

        .loginButton {
          width: 100%;

          height:
            62px;

          margin-top:
            22px;

          border:
            3px solid
            #174461;

          border-radius:
            14px;

          background:
            linear-gradient(
              180deg,
              #9bd9ff 0%,
              #73bdea 45%,
              #4e9ccc 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                .75
              ),

            inset 0 -6px 6px
              rgba(
                0,
                0,
                0,
                .16
              ),

            0 5px 0
              #17415c,

            0 9px 13px
              rgba(
                0,
                0,
                0,
                .25
              );

          color:
            #073b68;

          font-family:
            inherit;

          font-size:
            27px;

          font-weight:
            700;

          cursor:
            pointer;

          text-shadow:
            0 2px 0
            rgba(
              255,
              255,
              255,
              .55
            );

          transition:
            transform
            .12s ease,

            filter
            .12s ease,

            box-shadow
            .12s ease;
        }

        .loginButton:hover {
          filter:
            brightness(
              1.05
            );
        }

        .loginButton:active {
          transform:
            translateY(
              4px
            );

          box-shadow:
            inset 0 5px 5px
              rgba(
                255,
                255,
                255,
                .68
              ),

            inset 0 -5px 5px
              rgba(
                0,
                0,
                0,
                .15
              ),

            0 1px 0
              #17415c,

            0 5px 8px
              rgba(
                0,
                0,
                0,
                .21
              );
        }

        .loginButton:disabled {
          opacity:
            .65;

          cursor:
            wait;
        }

        /* =====================
           XABAR
        ===================== */

        .message {
          margin-top:
            14px;

          padding:
            10px 12px;

          border-radius:
            9px;

          text-align:
            center;

          font-family:
            Arial,
            sans-serif;

          font-size:
            13px;

          line-height:
            1.35;
        }

        .errorMessage {
          border:
            1px solid
            #b93a3a;

          background:
            #f5dede;

          color:
            #7e1515;
        }

        .successMessage {
          border:
            1px solid
            #26864b;

          background:
            #dff3e6;

          color:
            #176536;
        }

        /* =====================
           PASTKI IZOH
        ===================== */

        .infoBox {
          margin-top:
            34px;

          padding:
            17px 19px;

          border:
            2px solid
            #62696d;

          border-radius:
            13px;

          background:
            linear-gradient(
              180deg,
              #f5f5f5 0%,
              #d9d9d9 50%,
              #bebebe 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                .76
              ),

            0 4px 0
              #555d61;

          color: #333;

          text-align:
            center;

          font-size:
            15px;

          line-height:
            1.45;
        }

        /* =====================
           TABLET
        ===================== */

        @media (
          max-width: 700px
        ) {

          .page {
            padding:
              55px 12px
              30px;
          }

          .loginShell {
            width: 100%;

            padding:
              68px 18px
              25px;

            border-radius:
              23px;
          }

          .floatingTitle {
            top: -29px;

            width: 78%;

            min-height:
              56px;

            font-size:
              24px;

            border-radius:
              13px;
          }

          .loginCard {
            padding:
              22px;

            border-radius:
              17px;
          }

          .namePlate {
            min-height:
              88px;

            font-size:
              24px;

            border-radius:
              13px;
          }

          .form {
            margin-top:
              29px;
          }

          .formTitle {
            margin-bottom:
              14px;

            font-size:
              21px;
          }

          .codeInput {
            height:
              55px;

            font-size:
              16px;

            border-radius:
              11px;
          }

          .loginButton {
            height:
              55px;

            margin-top:
              18px;

            font-size:
              23px;

            border-radius:
              11px;
          }

          .infoBox {
            margin-top:
              27px;

            padding:
              14px;

            font-size:
              13px;
          }
        }

        /* =====================
           TELEFON
        ===================== */

        @media (
          max-width: 480px
        ) {

          .page {
            min-height:
              100svh;

            padding:
              47px 9px
              24px;
          }

          .loginShell {
            width: 100%;

            padding:
              57px 12px
              18px;

            border-width:
              2px;

            border-radius:
              20px;
          }

          .floatingTitle {
            top: -25px;

            width: 72%;

            min-height:
              49px;

            padding:
              7px 12px;

            border-width:
              2px;

            border-radius:
              11px;

            font-size:
              20px;
          }

          .loginCard {
            padding:
              16px;

            border-radius:
              15px;
          }

          .namePlate {
            min-height:
              74px;

            padding:
              10px;

            border-width:
              2px;

            border-radius:
              11px;

            font-size:
              21px;

            line-height:
              1.08;
          }

          .form {
            margin-top:
              23px;
          }

          .formTitle {
            margin-bottom:
              11px;

            font-size:
              18px;
          }

          .codeInput {
            height:
              50px;

            padding:
              0 13px;

            border-width:
              2px;

            border-radius:
              10px;

            font-size:
              15px;
          }

          .loginButton {
            height:
              50px;

            margin-top:
              15px;

            border-width:
              2px;

            border-radius:
              10px;

            font-size:
              21px;
          }

          .infoBox {
            margin-top:
              22px;

            padding:
              12px 10px;

            border-width:
              1px;

            border-radius:
              10px;

            font-size:
              12px;

            line-height:
              1.4;
          }
        }

        @media (
          max-width: 360px
        ) {

          .page {
            padding-left:
              6px;

            padding-right:
              6px;
          }

          .loginShell {
            padding-left:
              9px;

            padding-right:
              9px;
          }

          .loginCard {
            padding:
              13px;
          }

          .namePlate {
            font-size:
              19px;
          }

          .floatingTitle {
            font-size:
              18px;
          }

          .formTitle {
            font-size:
              17px;
          }

          .codeInput,
          .loginButton {
            height:
              47px;
          }

          .loginButton {
            font-size:
              19px;
          }
        }

      `}</style>

    </main>
  );
}
