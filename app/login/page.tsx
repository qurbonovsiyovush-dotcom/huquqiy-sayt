"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "error" | "success" | ""
  >("");

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setMessage("Maxsus kirish kodini kiriting.");
      setMessageType("error");
      return;
    }

    if (loading) return;

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: cleanCode,
        }),
      });

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

      const params = new URLSearchParams(
        window.location.search
      );

      const next = params.get("next");

      const safeNext =
        next &&
        next.startsWith("/") &&
        !next.startsWith("//")
          ? next
          : null;

      const redirectTo =
        safeNext || data.redirect || "/";

      window.setTimeout(() => {
        window.location.replace(redirectTo);
      }, 250);
    } catch (error) {
      console.error("LOGIN ERROR:", error);

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
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />

      <section className="loginCard">
        <div className="innerFrame">

          {/* ISM */}

          <div className="namePlate">
            <span>Qurbonov Siyovush</span>
            <span>Jamaliddinzoda</span>
          </div>

          {/* FORM */}

          <form
            className="loginForm"
            onSubmit={login}
          >
            <div className="loginTitle">
              Maxsus kirish kodi
            </div>

            <div className="titleDecoration">
              <span />
              <i />
              <span />
            </div>

            <label
              className="inputBox"
              htmlFor="access-code"
            >
              {/* 3D OLTIN KALIT */}

              <span
                className="keyBadge"
                aria-hidden="true"
              >
                <span className="keyShine" />

                <span className="keyHead">
                  <span className="keyHole" />
                </span>

                <span className="keyStem" />

                <span className="keyTooth keyToothOne" />
                <span className="keyTooth keyToothTwo" />
              </span>

              <span className="inputDivider" />

              <input
                id="access-code"
                type="text"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);

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
                  messageType === "success"
                    ? "successMessage"
                    : "errorMessage"
                }`}
              >
                {message}
              </div>
            )}

            {/* KIRISH */}

            <button
              type="submit"
              className="loginButton"
              disabled={loading}
            >
              <span className="buttonGlow" />

              <span className="buttonText">
                {loading
                  ? "Kutilmoqda..."
                  : "Kirish"}
              </span>

              <span
                className="buttonArrow"
                aria-hidden="true"
              >
                ›
              </span>
            </button>
          </form>

          {/* IZOH */}

          <div className="infoArea">
            <div className="infoLine" />

            <div className="infoPanel">
              <span
                className="shield"
                aria-hidden="true"
              >
                <span className="shieldInner">
                  ✓
                </span>
              </span>

              <p>
                Platformaga faqat administrator
                tomonidan berilgan maxsus kod
                orqali kirish mumkin.
              </p>
            </div>
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
              circle at 50% 15%,
              rgba(24, 169, 224, 0.18),
              transparent 35%
            ),
            radial-gradient(
              circle at 10% 70%,
              rgba(10, 119, 168, 0.14),
              transparent 38%
            ),
            linear-gradient(
              180deg,
              #062f49 0%,
              #04283d 38%,
              #031f30 68%,
              #031b2b 100%
            );

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        /* =========================
           FON NURLARI
        ========================= */

        .ambient {
          position: absolute;

          pointer-events: none;

          border-radius: 50%;

          filter: blur(65px);
        }

        .ambientOne {
          width: 320px;
          height: 320px;

          top: -160px;
          left: -100px;

          background:
            rgba(25, 184, 242, 0.18);
        }

        .ambientTwo {
          width: 300px;
          height: 300px;

          right: -140px;
          bottom: -130px;

          background:
            rgba(118, 223, 255, 0.09);
        }

        /* =========================
           ASOSIY PANEL
        ========================= */

        .loginCard {
          position: relative;
          z-index: 2;

          width: min(470px, 100%);

          padding: 2px;

          border:
            1px solid
            rgba(118, 223, 255, 0.58);

          border-radius: 30px;

          background:
            linear-gradient(
              145deg,
              rgba(118, 223, 255, 0.16),
              rgba(4, 44, 67, 0.25)
            );

          box-shadow:
            inset 0 1px 0
              rgba(255, 255, 255, 0.18),
            0 25px 60px
              rgba(0, 0, 0, 0.38);
        }

        .innerFrame {
          position: relative;

          padding: 38px 30px 28px;

          border-radius: 27px;

          background:
            linear-gradient(
              180deg,
              rgba(6, 59, 89, 0.94),
              rgba(3, 36, 55, 0.96)
            );

          box-shadow:
            inset 0 1px 0
              rgba(255, 255, 255, 0.07);
        }

        /* =========================
           ISM PANELI
        ========================= */

        .namePlate {
          position: relative;

          width: 100%;
          min-height: 115px;

          padding: 16px 20px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 2px;

          overflow: hidden;

          border:
            2px solid
            rgba(215, 169, 59, 0.7);

          border-radius: 22px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f2f4f5 24%,
              #d5dadd 61%,
              #aeb7bc 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255, 255, 255, 0.95),
            inset 0 -7px 8px
              rgba(0, 0, 0, 0.17),
            0 7px 0 #273941,
            0 14px 22px
              rgba(0, 0, 0, 0.34),
            0 0 18px
              rgba(215, 169, 59, 0.08);

          color: #063b59;

          text-align: center;

          font-size: 28px;
          font-weight: 700;
          line-height: 1.16;

          text-shadow:
            0 2px 0
              rgba(255, 255, 255, 0.85);
        }

        .namePlate::before {
          content: "";

          position: absolute;

          width: 60%;
          height: 45%;

          top: -15%;
          left: 10%;

          transform: rotate(-7deg);

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.62),
              transparent
            );

          filter: blur(5px);

          pointer-events: none;
        }

        /* =========================
           FORM
        ========================= */

        .loginForm {
          margin-top: 42px;
        }

        .loginTitle {
          color: #f4f7fa;

          text-align: center;

          font-size: 25px;
          font-weight: 700;

          text-shadow:
            0 3px 5px
              rgba(0, 0, 0, 0.42);
        }

        .titleDecoration {
          width: 130px;

          margin:
            11px auto
            19px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 8px;
        }

        .titleDecoration span {
          width: 50px;
          height: 1px;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(215, 169, 59, 0.72)
            );
        }

        .titleDecoration span:last-child {
          transform: rotate(180deg);
        }

        .titleDecoration i {
          width: 7px;
          height: 7px;

          display: block;

          transform: rotate(45deg);

          border:
            1px solid
            #f4c75d;

          background:
            #d7a93b;

          box-shadow:
            0 0 7px
              rgba(215, 169, 59, 0.45);
        }

        /* =========================
           INPUT
        ========================= */

        .inputBox {
          position: relative;

          width: 100%;
          height: 68px;

          padding:
            0 18px
            0 10px;

          display: flex;
          align-items: center;

          gap: 12px;

          overflow: hidden;

          border:
            2px solid
            #19b8f2;

          border-radius: 19px;

          background:
            linear-gradient(
              180deg,
              rgba(2, 40, 61, 0.96),
              rgba(2, 29, 45, 0.98)
            );

          box-shadow:
            inset 0 5px 10px
              rgba(0, 0, 0, 0.35),
            inset 0 1px 0
              rgba(255, 255, 255, 0.09),
            0 5px 14px
              rgba(0, 0, 0, 0.22),
            0 0 13px
              rgba(25, 184, 242, 0.08);

          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .inputBox:focus-within {
          border-color: #76dfff;

          box-shadow:
            inset 0 5px 10px
              rgba(0, 0, 0, 0.34),
            0 0 0 3px
              rgba(25, 184, 242, 0.12),
            0 0 20px
              rgba(25, 184, 242, 0.16);
        }

        .inputDivider {
          width: 1px;
          height: 34px;

          flex: 0 0 auto;

          background:
            linear-gradient(
              180deg,
              transparent,
              rgba(118, 223, 255, 0.5),
              transparent
            );
        }

        .inputBox input {
          width: 100%;
          min-width: 0;

          border: none;
          outline: none;

          background: transparent;

          color: #f4f7fa;

          font-family: inherit;
          font-size: 18px;

          text-transform: uppercase;
        }

        .inputBox input::placeholder {
          color:
            rgba(218, 230, 237, 0.52);

          text-transform: none;
        }

        /* =========================
           3D OLTIN KALIT
        ========================= */

        .keyBadge {
          position: relative;

          width: 46px;
          height: 46px;

          flex: 0 0 46px;

          display: block;

          border:
            1px solid
            rgba(255, 223, 130, 0.72);

          border-radius: 50%;

          background:
            radial-gradient(
              circle at 30% 24%,
              #fff7c6 0%,
              #ffd96b 18%,
              #d7a93b 42%,
              #a66c0c 68%,
              #553000 100%
            );

          box-shadow:
            inset 0 3px 3px
              rgba(255, 255, 255, 0.76),
            inset 0 -5px 6px
              rgba(73, 37, 0, 0.54),
            0 4px 0 #4b2b02,
            0 7px 10px
              rgba(0, 0, 0, 0.42),
            0 0 13px
              rgba(215, 169, 59, 0.28);

          transform: rotate(-8deg);

          transition:
            transform 0.2s ease,
            filter 0.2s ease,
            box-shadow 0.2s ease;
        }

        .inputBox:focus-within
          .keyBadge {
          transform:
            rotate(0deg)
            scale(1.06);

          filter: brightness(1.08);

          box-shadow:
            inset 0 3px 3px
              rgba(255, 255, 255, 0.82),
            inset 0 -5px 6px
              rgba(73, 37, 0, 0.48),
            0 4px 0 #4b2b02,
            0 8px 12px
              rgba(0, 0, 0, 0.42),
            0 0 19px
              rgba(255, 200, 72, 0.38);
        }

        .keyShine {
          position: absolute;

          width: 18px;
          height: 8px;

          top: 5px;
          left: 8px;

          z-index: 5;

          transform: rotate(-25deg);

          border-radius: 50%;

          background:
            rgba(255, 255, 255, 0.56);

          filter: blur(2px);
        }

        .keyHead {
          position: absolute;

          width: 17px;
          height: 17px;

          top: 8px;
          left: 7px;

          z-index: 3;

          border:
            4px solid
            #754503;

          border-radius: 50%;

          background:
            linear-gradient(
              145deg,
              #ffe98b,
              #c78916
            );

          box-shadow:
            inset 1px 1px 2px
              rgba(255, 255, 255, 0.65),
            1px 2px 2px
              rgba(67, 33, 0, 0.42);
        }

        .keyHole {
          position: absolute;

          width: 5px;
          height: 5px;

          top: 2px;
          left: 2px;

          border-radius: 50%;

          background: #543000;

          box-shadow:
            inset 0 1px 2px
              rgba(0, 0, 0, 0.6);
        }

        .keyStem {
          position: absolute;

          width: 24px;
          height: 8px;

          top: 22px;
          left: 17px;

          z-index: 2;

          transform: rotate(5deg);

          border-radius:
            2px 6px 6px 2px;

          background:
            linear-gradient(
              180deg,
              #fff0a5 0%,
              #ffd052 25%,
              #c88812 62%,
              #754302 100%
            );

          box-shadow:
            inset 0 2px 2px
              rgba(255, 255, 255, 0.7),
            0 2px 2px
              rgba(55, 27, 0, 0.42);
        }

        .keyTooth {
          position: absolute;

          z-index: 4;

          width: 6px;

          border-radius:
            0 0 2px 2px;

          background:
            linear-gradient(
              180deg,
              #ffd96b,
              #9b5b06
            );

          box-shadow:
            1px 1px 1px
              rgba(55, 27, 0, 0.35);
        }

        .keyToothOne {
          height: 10px;

          top: 26px;
          right: 6px;
        }

        .keyToothTwo {
          height: 7px;

          top: 26px;
          right: 13px;
        }

        /* =========================
           XABAR
        ========================= */

        .message {
          margin-top: 13px;

          padding: 10px 12px;

          border-radius: 11px;

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
            rgba(255, 119, 119, 0.6);

          background:
            rgba(125, 15, 15, 0.34);

          color: #ffd5d5;
        }

        .successMessage {
          border:
            1px solid
            rgba(108, 229, 158, 0.62);

          background:
            rgba(16, 105, 55, 0.32);

          color: #d7ffe7;
        }

        /* =========================
           3D KIRISH TUGMASI
        ========================= */

        .loginButton {
          position: relative;

          width: 100%;
          height: 64px;

          margin-top: 20px;

          display: flex;
          align-items: center;
          justify-content: center;

          overflow: hidden;

          border:
            2px solid
            #76dfff;

          border-radius: 18px;

          background:
            linear-gradient(
              180deg,
              #61d9ff 0%,
              #19b8f2 42%,
              #087db7 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255, 255, 255, 0.5),
            inset 0 -6px 7px
              rgba(0, 54, 89, 0.3),
            0 6px 0 #035b82,
            0 13px 20px
              rgba(0, 0, 0, 0.3),
            0 0 15px
              rgba(25, 184, 242, 0.15);

          color: #ffffff;

          font-family: inherit;

          cursor: pointer;

          transition:
            transform 0.12s ease,
            box-shadow 0.12s ease,
            filter 0.12s ease;
        }

        .buttonGlow {
          position: absolute;

          width: 75%;
          height: 20px;

          top: 3px;
          left: 12%;

          border-radius: 50%;

          background:
            rgba(255, 255, 255, 0.25);

          filter: blur(7px);
        }

        .buttonText {
          position: relative;
          z-index: 2;

          font-size: 27px;
          font-weight: 700;

          text-shadow:
            0 2px 3px
              rgba(0, 0, 0, 0.3);
        }

        .buttonArrow {
          position: absolute;

          right: 20px;

          z-index: 2;

          font-family: Arial, sans-serif;
          font-size: 35px;
          font-weight: 300;

          color:
            rgba(255, 255, 255, 0.9);

          text-shadow:
            0 2px 3px
              rgba(0, 0, 0, 0.28);
        }

        .loginButton:hover {
          filter: brightness(1.06);
        }

        .loginButton:active {
          transform: translateY(5px);

          box-shadow:
            inset 0 5px 5px
              rgba(255, 255, 255, 0.42),
            inset 0 -4px 6px
              rgba(0, 54, 89, 0.25),
            0 1px 0 #035b82,
            0 6px 10px
              rgba(0, 0, 0, 0.24);
        }

        .loginButton:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        /* =========================
           PASTKI INFO
        ========================= */

        .infoArea {
          margin-top: 36px;
        }

        .infoLine {
          width: 100%;
          height: 1px;

          margin-bottom: 18px;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(118, 223, 255, 0.35),
              transparent
            );
        }

        .infoPanel {
          padding: 13px 15px;

          display: flex;
          align-items: center;

          gap: 13px;

          border:
            1px solid
            rgba(118, 223, 255, 0.18);

          border-radius: 15px;

          background:
            linear-gradient(
              145deg,
              rgba(8, 63, 94, 0.45),
              rgba(2, 31, 48, 0.42)
            );

          box-shadow:
            inset 0 1px 0
              rgba(255, 255, 255, 0.06);
        }

        .infoPanel p {
          margin: 0;

          color:
            rgba(228, 239, 244, 0.78);

          font-size: 14px;
          line-height: 1.45;
        }

        /* =========================
           MINI 3D QALQON
        ========================= */

        .shield {
          position: relative;

          width: 36px;
          height: 41px;

          flex: 0 0 36px;

          display: flex;
          align-items: center;
          justify-content: center;

          clip-path:
            polygon(
              50% 0,
              92% 16%,
              85% 70%,
              50% 100%,
              15% 70%,
              8% 16%
            );

          background:
            linear-gradient(
              145deg,
              #76dfff,
              #0a8bc8 48%,
              #044e78
            );

          box-shadow:
            0 4px 8px
              rgba(0, 0, 0, 0.3);
        }

        .shieldInner {
          width: 28px;
          height: 32px;

          display: flex;
          align-items: center;
          justify-content: center;

          clip-path:
            polygon(
              50% 0,
              92% 16%,
              85% 70%,
              50% 100%,
              15% 70%,
              8% 16%
            );

          background:
            linear-gradient(
              180deg,
              #075e8d,
              #033d60
            );

          color: #dff8ff;

          font-family: Arial, sans-serif;
          font-size: 16px;
          font-weight: 700;
        }

        /* =========================
           TABLET
        ========================= */

        @media (max-width: 700px) {
          .loginPage {
            padding: 14px;
          }

          .loginCard {
            width: min(430px, 100%);

            border-radius: 24px;
          }

          .innerFrame {
            padding:
              26px 22px 22px;

            border-radius: 21px;
          }

          .namePlate {
            min-height: 91px;

            padding: 12px 15px;

            border-radius: 17px;

            font-size: 23px;
          }

          .loginForm {
            margin-top: 31px;
          }

          .loginTitle {
            font-size: 22px;
          }

          .titleDecoration {
            margin-bottom: 15px;
          }

          .inputBox {
            height: 59px;

            border-radius: 16px;
          }

          .inputBox input {
            font-size: 16px;
          }

          .loginButton {
            height: 57px;

            margin-top: 17px;

            border-radius: 15px;
          }

          .buttonText {
            font-size: 23px;
          }

          .buttonArrow {
            font-size: 30px;
          }

          .infoArea {
            margin-top: 27px;
          }
        }

        /* =========================
           TELEFON
        ========================= */

        @media (max-width: 480px) {
          .loginPage {
            min-height: 100svh;

            padding: 10px 12px;
          }

          .loginCard {
            width: 100%;

            border-radius: 21px;
          }

          .innerFrame {
            padding:
              21px 17px 18px;

            border-radius: 19px;
          }

          .namePlate {
            min-height: 76px;

            padding: 10px;

            border-width: 1.5px;
            border-radius: 14px;

            box-shadow:
              inset 0 5px 5px
                rgba(255, 255, 255, 0.95),
              inset 0 -5px 5px
                rgba(0, 0, 0, 0.17),
              0 5px 0 #273941,
              0 10px 15px
                rgba(0, 0, 0, 0.28);

            font-size:
              clamp(
                20px,
                6vw,
                24px
              );

            line-height: 1.08;
          }

          .loginForm {
            margin-top: 25px;
          }

          .loginTitle {
            font-size: 20px;
          }

          .titleDecoration {
            width: 105px;

            margin:
              8px auto
              13px;
          }

          .titleDecoration span {
            width: 38px;
          }

          /* MOBIL KALIT */

          .keyBadge {
            width: 39px;
            height: 39px;

            flex-basis: 39px;
          }

          .keyHead {
            width: 14px;
            height: 14px;

            top: 7px;
            left: 6px;

            border-width: 3px;
          }

          .keyHole {
            width: 4px;
            height: 4px;

            top: 2px;
            left: 2px;
          }

          .keyStem {
            width: 20px;
            height: 7px;

            top: 19px;
            left: 15px;
          }

          .keyToothOne {
            height: 8px;

            top: 22px;
            right: 5px;
          }

          .keyToothTwo {
            height: 6px;

            top: 22px;
            right: 11px;
          }

          .keyShine {
            width: 14px;
            height: 6px;

            top: 4px;
            left: 7px;
          }

          .inputBox {
            height: 54px;

            padding:
              0 13px
              0 7px;

            gap: 9px;

            border-radius: 14px;
          }

          .inputDivider {
            height: 28px;
          }

          .inputBox input {
            font-size: 15px;
          }

          .loginButton {
            height: 53px;

            margin-top: 15px;

            border-radius: 14px;

            box-shadow:
              inset 0 5px 4px
                rgba(255, 255, 255, 0.5),
              inset 0 -5px 5px
                rgba(0, 54, 89, 0.27),
              0 5px 0 #035b82,
              0 9px 14px
                rgba(0, 0, 0, 0.27);
          }

          .buttonText {
            font-size: 21px;
          }

          .buttonArrow {
            right: 16px;

            font-size: 27px;
          }

          .infoArea {
            margin-top: 24px;
          }

          .infoLine {
            margin-bottom: 13px;
          }

          .infoPanel {
            padding: 11px 12px;

            gap: 10px;

            border-radius: 13px;
          }

          .infoPanel p {
            font-size: 12.5px;
            line-height: 1.4;
          }

          .shield {
            width: 31px;
            height: 35px;

            flex-basis: 31px;
          }

          .shieldInner {
            width: 24px;
            height: 28px;

            font-size: 13px;
          }
        }

        /* =========================
           JUDA KICHIK TELEFON
        ========================= */

        @media (max-width: 360px) {
          .loginPage {
            padding: 7px;
          }

          .innerFrame {
            padding:
              17px 13px 15px;
          }

          .namePlate {
            min-height: 68px;

            font-size: 19px;
          }

          .loginForm {
            margin-top: 21px;
          }

          .loginTitle {
            font-size: 18px;
          }

          .inputBox {
            height: 50px;
          }

          .keyBadge {
            width: 35px;
            height: 35px;

            flex-basis: 35px;

            transform:
              rotate(-8deg)
              scale(0.92);
          }

          .loginButton {
            height: 49px;
          }

          .buttonText {
            font-size: 19px;
          }

          .infoArea {
            margin-top: 20px;
          }

          .infoPanel p {
            font-size: 11.5px;
          }
        }
      `}</style>
    </main>
  );
}
