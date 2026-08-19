"use client";

import { useEffect, useState, type FormEvent } from "react";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const response = await fetch("/api/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (cancelled) return;

        if (response.ok) {
          window.location.replace("/");
          return;
        }
      } catch {
        // Sessiya bo'lmasa login sahifasi ko'rinadi.
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanCode = code.trim();

    if (!cleanCode) {
      setLoginError("Maxsus kirish kodini kiriting.");
      return;
    }

    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: cleanCode,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setLoginError(
          data?.error ||
            data?.message ||
            "Kirish amalga oshmadi."
        );
        return;
      }

      // Server cookie-ni o'rnatgach asosiy sahifani to'liq qayta yuklaymiz.
      window.location.replace("/");
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      setLoginError("Server bilan bog‘lanishda xatolik yuz berdi.");
    } finally {
      setLoginLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="checkingPage">
        Tekshirilmoqda...
        <style jsx>{`
          .checkingPage {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #05283e;
            color: white;
            font-family: "Bell MT", "Times New Roman", serif;
            font-size: 22px;
            font-weight: 700;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="loginPage">
      <section className="loginCard">
        <div className="nameOuter">
          <div className="nameInner">
            Qurbonov Siyovush Jamaliddinzoda
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <label className="label">
            Maxsus kirish kodi
          </label>

          <div className="inputWrapper">
            <span className="icon">🔐</span>

            <input
              className="input"
              type="text"
              value={code}
              disabled={loginLoading}
              autoComplete="off"
              autoFocus
              placeholder="Kirish kodini kiriting"
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setLoginError("");
              }}
            />
          </div>

          {loginError && (
            <div className="error">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className="loginButton"
            disabled={loginLoading}
          >
            {loginLoading
              ? "Tekshirilmoqda..."
              : "Kirish"}
          </button>
        </form>

        <div className="info">
          Platformaga faqat administrator tomonidan berilgan maxsus kod orqali kirish mumkin.
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .loginPage {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px 20px;
          background:
            radial-gradient(
              circle at 50% 0%,
              #16547d 0%,
              #0b3b5a 35%,
              #05283e 65%,
              #021824 100%
            );
          font-family: "Bell MT", "Times New Roman", serif;
        }

        .loginCard {
          width: min(720px, 100%);
          padding: 50px 55px 55px;
          border: 1px solid #368bc0;
          border-radius: 40px;
          background:
            linear-gradient(
              145deg,
              #16496d 0%,
              #0b3857 45%,
              #06273e 100%
            );
          box-shadow:
            inset 4px 4px 10px rgba(255,255,255,.10),
            inset -8px -8px 18px rgba(0,0,0,.32),
            0 30px 60px rgba(0,0,0,.45);
        }

        .nameOuter {
          padding: 5px;
          margin-bottom: 48px;
          border: 1px solid #101010;
          border-radius: 28px;
          background:
            linear-gradient(
              180deg,
              #f7f7f7 0%,
              #bdbdbd 25%,
              #777 65%,
              #292929 100%
            );
          box-shadow:
            0 8px 0 #181818,
            0 15px 22px rgba(0,0,0,.45);
        }

        .nameInner {
          min-height: 125px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              #eee 0%,
              #d6d6d6 40%,
              #bdbdbd 100%
            );
          box-shadow:
            inset 7px 7px 10px rgba(255,255,255,.95),
            inset -7px -7px 12px rgba(0,0,0,.24);
          text-align: center;
          font-size: clamp(26px, 4vw, 36px);
          font-weight: 700;
          text-shadow: 1px 1px 0 white;
        }

        .label {
          display: block;
          margin-bottom: 12px;
          color: white;
          text-align: center;
          font-size: 27px;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0,0,0,.5);
        }

        .inputWrapper {
          width: 100%;
          height: 78px;
          display: flex;
          align-items: center;
          overflow: hidden;
          border: 1px solid #29baff;
          border-radius: 21px;
          background:
            linear-gradient(
              145deg,
              #031b2c,
              #0c4167
            );
          box-shadow:
            inset 7px 7px 13px rgba(0,0,0,.55),
            0 5px 10px rgba(0,0,0,.20);
        }

        .inputWrapper:focus-within {
          border-color: #8ae4ff;
          box-shadow:
            inset 7px 7px 13px rgba(0,0,0,.55),
            0 0 14px rgba(49,190,255,.35);
        }

        .icon {
          width: 75px;
          flex-shrink: 0;
          text-align: center;
          font-size: 28px;
        }

        .input {
          width: 100%;
          height: 100%;
          min-width: 0;
          padding-right: 25px;
          border: none;
          outline: none;
          background: transparent;
          color: white;
          font: inherit;
          font-size: 23px;
          font-weight: 700;
          letter-spacing: 2px;
        }

        .input::placeholder {
          color: #8296a7;
          font-weight: 400;
          letter-spacing: 0;
        }

        .error {
          margin: 18px 0 0;
          padding: 13px 15px;
          border: 1px solid rgba(255,100,100,.65);
          border-radius: 13px;
          background: rgba(150,20,20,.30);
          color: #ffe3e3;
          text-align: center;
          font-size: 17px;
        }

        .loginButton {
          width: 100%;
          height: 82px;
          margin-top: 24px;
          border: 1px solid #9eeaff;
          border-radius: 21px;
          cursor: pointer;
          color: white;
          font: inherit;
          font-size: 31px;
          font-weight: 700;
          background:
            linear-gradient(
              180deg,
              #5bd3fb 0%,
              #27b4ed 35%,
              #0b83bd 75%,
              #07658f 100%
            );
          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.45),
            inset 0 -5px 7px rgba(0,0,0,.15),
            0 9px 0 #034c70,
            0 15px 22px rgba(0,0,0,.35);
        }

        .loginButton:disabled {
          opacity: .65;
          cursor: wait;
        }

        .info {
          margin-top: 35px;
          padding-top: 22px;
          border-top: 1px solid rgba(255,255,255,.15);
          color: rgba(255,255,255,.65);
          text-align: center;
          font-size: 16px;
          line-height: 1.5;
        }

        @media (max-width: 600px) {
          .loginCard {
            padding: 35px 20px 40px;
            border-radius: 28px;
          }

          .nameInner {
            min-height: 100px;
          }

          .label {
            font-size: 22px;
          }

          .inputWrapper {
            height: 68px;
          }

          .input {
            font-size: 19px;
          }

          .loginButton {
            height: 70px;
            font-size: 26px;
          }
        }
      `}</style>
    </main>
  );
}