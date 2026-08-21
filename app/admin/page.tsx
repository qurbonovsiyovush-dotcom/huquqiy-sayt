"use client";

export default function AdminPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '"Bell MT", "Times New Roman", serif',
        background: "#f5f7f8",
      }}
    >
      <div
        style={{
          textAlign: "center",
        }}
      >
        <h1>Admin panel</h1>

        <p>
          Foydalanuvchilarni boshqarish uchun davom eting.
        </p>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/admin/requests";
          }}
          style={{
            marginTop: "20px",
            padding: "12px 24px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 700,
          }}
        >
          Admin boshqaruviga o‘tish
        </button>
      </div>
    </main>
  );
}
