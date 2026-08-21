"use client";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const sections = [
    {
      icon: "👥",
      title: "Foydalanuvchilar va ruxsatlar",
      description:
        "Foydalanuvchilar, kirish kodlari va saytga kirish so‘rovlarini boshqarish.",
      href: "/admin/requests",
    },
    {
      icon: "📚",
      title: "Lug‘at boshqaruvi",
      description:
        "4000 Essential English Words bo‘yicha kitob, unit, so‘z va misol gaplarni boshqarish.",
      href: "/admin/dictionary",
    },
    {
      icon: "📝",
      title: "Testlar",
      description:
        "Saytdagi testlarni boshqarish va test tizimini nazorat qilish.",
      href: "/admin/tests",
    },
    {
      icon: "📊",
      title: "Natijalar",
      description:
        "Foydalanuvchilarning test natijalari va ko‘rsatkichlarini ko‘rish.",
      href: "/admin/results",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px 20px 60px",
        fontFamily: '"Bell MT", "Times New Roman", serif',
        background:
          "linear-gradient(180deg, #ffffff 0%, #f4f7f9 55%, #edf2f5 100%)",
        color: "#062f4f",
      }}
    >
      {/* =========================================
          YUQORI PANEL
      ========================================= */}
      <header
        style={{
          width: "min(1500px, 96%)",
          margin: "0 auto",
          padding: "22px 28px",
          borderRadius: "25px",
          border: "2px solid #0a4668",
          background:
            "linear-gradient(180deg, #82cff4 0%, #55addc 55%, #3893c2 100%)",
          boxShadow:
            "0 8px 0 #174d69, 0 16px 24px rgba(0,0,0,0.20), inset 0 2px 2px rgba(255,255,255,0.9)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/")}
          style={topButtonStyle}
        >
          Qurbonov Siyovush Jamaliddinzoda
        </button>

        <div
          style={{
            display: "flex",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => router.push("/")}
            style={smallTopButtonStyle}
          >
            Asosiy sahifa
          </button>

          <button
            type="button"
            onClick={() => router.push("/logout")}
            style={logoutButtonStyle}
          >
            Chiqish
          </button>
        </div>
      </header>

      {/* =========================================
          SARLAVHA
      ========================================= */}
      <section
        style={{
          width: "min(1120px, 94%)",
          margin: "65px auto 0",
          position: "relative",
          paddingTop: "34px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "50%",
            transform: "translate(-50%, -50%)",
            minWidth: "270px",
            textAlign: "center",
            padding: "14px 32px",
            borderRadius: "15px",
            border: "2px solid #174d69",
            background:
              "linear-gradient(180deg, #8ad4f8 0%, #54addd 100%)",
            boxShadow:
              "0 7px 0 #174d69, 0 10px 18px rgba(0,0,0,0.20)",
            fontSize: "27px",
            fontWeight: 700,
            zIndex: 2,
          }}
        >
          Admin panel
        </div>

        <div
          style={{
            padding: "75px 35px 48px",
            textAlign: "center",
            borderRadius: "24px",
            border: "2px solid #30383c",
            background:
              "linear-gradient(145deg, #666b6e 0%, #3e4346 100%)",
            boxShadow:
              "0 8px 0 #252b2e, 0 18px 30px rgba(0,0,0,0.20)",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "white",
              fontSize: "clamp(29px, 4vw, 42px)",
              lineHeight: 1.2,
              textShadow: "0 2px 2px rgba(0,0,0,0.4)",
            }}
          >
            Sayt boshqaruv markazi
          </h1>

          <p
            style={{
              color: "#edf7fc",
              margin: "18px auto 0",
              maxWidth: "720px",
              fontSize: "19px",
              lineHeight: 1.6,
            }}
          >
            Kerakli bo‘limni tanlang va sayt ma’lumotlarini boshqaring.
          </p>
        </div>
      </section>

      {/* =========================================
          ADMIN BO'LIMLARI
      ========================================= */}
      <section
        style={{
          width: "min(1120px, 94%)",
          margin: "65px auto 0",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
          gap: "35px",
        }}
      >
        {sections.map((section) => (
          <button
            key={section.href}
            type="button"
            onClick={() => router.push(section.href)}
            style={{
              border: "2px solid #333b3f",
              borderRadius: "24px",
              padding: "0",
              cursor: "pointer",
              overflow: "hidden",
              background:
                "linear-gradient(145deg, #666b6e 0%, #3d4245 100%)",
              boxShadow:
                "0 8px 0 #272d30, 0 16px 26px rgba(0,0,0,0.20)",
              fontFamily: "inherit",
              textAlign: "left",
              transition: "transform 0.15s ease",
              minHeight: "260px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {/* ko'k sarlavha */}
            <div
              style={{
                padding: "20px 24px",
                background:
                  "linear-gradient(180deg, #8bd5f8 0%, #52abda 100%)",
                borderBottom: "6px solid #174d69",
                color: "#063d63",
                display: "flex",
                alignItems: "center",
                gap: "15px",
              }}
            >
              <span
                style={{
                  fontSize: "35px",
                }}
              >
                {section.icon}
              </span>

              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  lineHeight: 1.15,
                }}
              >
                {section.title}
              </span>
            </div>

            {/* tavsif */}
            <div
              style={{
                padding: "27px",
                color: "white",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "18px",
                  lineHeight: 1.55,
                  minHeight: "82px",
                }}
              >
                {section.description}
              </p>

              <div
                style={{
                  marginTop: "22px",
                  display: "inline-block",
                  padding: "11px 22px",
                  borderRadius: "11px",
                  border: "1px solid #70787c",
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                  color: "#062f4f",
                  fontWeight: 700,
                  fontSize: "16px",
                  boxShadow: "0 4px 0 #737a7d",
                }}
              >
                Boshqarish →
              </div>
            </div>
          </button>
        ))}
      </section>

      {/* =========================================
          PASTKI YOZUV
      ========================================= */}
      <footer
        style={{
          width: "min(1120px, 94%)",
          margin: "60px auto 0",
          textAlign: "center",
          color: "#60727d",
          fontSize: "15px",
        }}
      >
        Qurbonov Siyovush Jamaliddinzoda — Admin boshqaruv paneli
      </footer>
    </main>
  );
}

/* =========================================================
   BUTTON STYLES
========================================================= */

const topButtonStyle: React.CSSProperties = {
  padding: "15px 25px",
  borderRadius: "13px",
  border: "2px solid #666",
  background: "linear-gradient(180deg, #ffffff 0%, #cecece 100%)",
  boxShadow: "0 5px 0 #747474",
  color: "#111",
  fontFamily: '"Bell MT", "Times New Roman", serif',
  fontSize: "20px",
  fontWeight: 700,
  cursor: "pointer",
};

const smallTopButtonStyle: React.CSSProperties = {
  padding: "13px 24px",
  borderRadius: "12px",
  border: "2px solid #777",
  background: "linear-gradient(180deg, #ffffff 0%, #d4d4d4 100%)",
  boxShadow: "0 4px 0 #777",
  color: "#111",
  fontFamily: '"Bell MT", "Times New Roman", serif',
  fontWeight: 700,
  cursor: "pointer",
};

const logoutButtonStyle: React.CSSProperties = {
  padding: "13px 28px",
  borderRadius: "12px",
  border: "2px solid #b01818",
  background: "linear-gradient(180deg, #ff6262 0%, #d40c0c 100%)",
  boxShadow: "0 4px 0 #8c1515",
  color: "white",
  fontFamily: '"Bell MT", "Times New Roman", serif',
  fontWeight: 700,
  cursor: "pointer",
};
