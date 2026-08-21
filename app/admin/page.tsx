"use client";

export default function AdminPage() {
  const goTo = (path: string) => {
    window.location.href = path;
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background:
          "linear-gradient(180deg, #ffffff 0%, #f4f6f8 60%, #e9edf2 100%)",
        fontFamily:
          '"Bell MT", "Times New Roman", serif',
        color: "#111",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            marginBottom: "32px",
          }}
        >
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "40px",
              color: "#073b68",
            }}
          >
            Admin panel
          </h1>

          <p
            style={{
              margin: 0,
              color: "#667085",
              fontSize: "18px",
            }}
          >
            Sayt bo‘limlarini boshqarish
          </p>
        </div>

        {/* KARTALAR */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "24px",
          }}
        >
          {/* VOCABULARY */}
          <button
            type="button"
            onClick={() =>
              goTo("/admin/dictionary")
            }
            style={cardStyle("#8bd3ff", "#4b9fd3")}
          >
            <div style={iconStyle}>📚</div>

            <div style={titleStyle}>
              Vocabulary boshqaruvi
            </div>

            <div style={textStyle}>
              Book va Unitlarga inglizcha so‘zlar,
              tarjima va misol gaplarni qo‘shish
            </div>
          </button>

          {/* TESTLAR */}
          <button
            type="button"
            onClick={() =>
              goTo("/admin/tests")
            }
            style={cardStyle("#d9e8ff", "#a7c5ef")}
          >
            <div style={iconStyle}>📝</div>

            <div style={titleStyle}>
              Testlar
            </div>

            <div style={textStyle}>
              Testlarni yaratish va boshqarish
            </div>
          </button>

          {/* NATIJALAR */}
          <button
            type="button"
            onClick={() =>
              goTo("/admin/results")
            }
            style={cardStyle("#e9f7d8", "#b8d88d")}
          >
            <div style={iconStyle}>📊</div>

            <div style={titleStyle}>
              Natijalar
            </div>

            <div style={textStyle}>
              Foydalanuvchilarning test natijalarini ko‘rish
            </div>
          </button>

          {/* SO‘ROVLAR */}
          <button
            type="button"
            onClick={() =>
              goTo("/admin/requests")
            }
            style={cardStyle("#fff0d6", "#e8c17c")}
          >
            <div style={iconStyle}>📩</div>

            <div style={titleStyle}>
              So‘rovlar
            </div>

            <div style={textStyle}>
              Foydalanuvchilardan kelgan so‘rovlarni ko‘rish
            </div>
          </button>
        </div>

        {/* PASTKI INFO */}
        <div
          style={{
            marginTop: "35px",
            padding: "20px 22px",
            border: "1px solid #d0d5dd",
            borderRadius: "16px",
            background: "rgba(255,255,255,.8)",
            color: "#475467",
            fontSize: "16px",
            lineHeight: 1.6,
          }}
        >
          Bu sahifa administrator uchun mo‘ljallangan.
          Oddiy foydalanuvchilar admin bo‘limlariga kira olmaydi.
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   STYLES
========================================================= */

const iconStyle: React.CSSProperties = {
  fontSize: "42px",
  marginBottom: "16px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#073b68",
  marginBottom: "10px",
};

const textStyle: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: 1.5,
  color: "#344054",
};

function cardStyle(
  topColor: string,
  bottomColor: string
): React.CSSProperties {
  return {
    minHeight: "190px",
    padding: "28px 24px",
    textAlign: "left",
    border: "3px solid #36454f",
    borderRadius: "22px",
    background: `linear-gradient(180deg, ${topColor} 0%, ${bottomColor} 100%)`,
    boxShadow:
      "inset 0 7px 6px rgba(255,255,255,.72), inset 0 -6px 6px rgba(0,0,0,.12), 0 6px 0 #4b555b, 0 12px 18px rgba(0,0,0,.16)",
    cursor: "pointer",
    fontFamily: '"Bell MT", "Times New Roman", serif',
    transition: "transform .15s ease, filter .15s ease",
  };
}
