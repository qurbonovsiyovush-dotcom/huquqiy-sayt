"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const menu = [
    {
      name: "Admin panel",
      path: "/admin",
    },
    {
      name: "Foydalanuvchilar",
      path: "/admin/requests",
    },
    {
      name: "Lug‘at",
      path: "/admin/dictionary",
    },
    {
      name: "Testlar",
      path: "/admin/tests",
    },
    {
      name: "Natijalar",
      path: "/admin/results",
    },
  ];

  function isActive(path: string) {
    if (path === "/admin") {
      return pathname === "/admin";
    }

    return pathname.startsWith(path);
  }

  return (
    <>
      <nav className="adminNavigation">
        <div className="navigationInner">
          {menu.map((item) => (
            <button
              key={item.path}
              type="button"
              className={
                isActive(item.path)
                  ? "navButton active"
                  : "navButton"
              }
              onClick={() => router.push(item.path)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </nav>

      {children}

      <style jsx>{`
        .adminNavigation {
          position: sticky;
          top: 0;
          z-index: 9999;

          width: 100%;

          padding: 13px 20px 17px;

          background: linear-gradient(
            180deg,
            #6b7074 0%,
            #4d5357 55%,
            #3b4145 100%
          );

          border-bottom: 3px solid #26343d;

          box-shadow:
            0 6px 0 #252d32,
            0 10px 18px rgba(0, 0, 0, 0.22);
        }

        .navigationInner {
          width: min(1350px, 96%);
          margin: 0 auto;

          display: flex;
          justify-content: center;
          align-items: center;

          gap: 15px;
        }

        .navButton {
          min-width: 170px;
          height: 52px;

          padding: 0 22px;

          border: 2px solid #596368;
          border-radius: 11px;

          background: linear-gradient(
            180deg,
            #f9f9f9 0%,
            #dedede 48%,
            #bcbcbc 100%
          );

          box-shadow:
            inset 0 3px 3px rgba(255, 255, 255, 0.9),
            0 5px 0 #596267,
            0 7px 9px rgba(0, 0, 0, 0.18);

          color: #172f3e;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          font-size: 16px;
          font-weight: 700;

          cursor: pointer;

          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            background 0.15s ease;
        }

        .navButton:hover {
          transform: translateY(-2px);

          background: linear-gradient(
            180deg,
            #dff5ff 0%,
            #a9ddf5 48%,
            #72b9dd 100%
          );
        }

        .navButton.active {
          color: #073b61;

          border-color: #174b69;

          background: linear-gradient(
            180deg,
            #9edcff 0%,
            #61b5df 48%,
            #3b91bd 100%
          );

          box-shadow:
            inset 0 3px 3px rgba(255, 255, 255, 0.65),
            0 5px 0 #17445f,
            0 8px 12px rgba(0, 0, 0, 0.22);
        }

        .navButton:active {
          transform: translateY(4px);
          box-shadow: none;
        }

        @media (max-width: 1000px) {
          .navigationInner {
            justify-content: flex-start;
            overflow-x: auto;

            padding-bottom: 5px;
          }

          .navButton {
            flex: 0 0 auto;
          }
        }

        @media (max-width: 600px) {
          .adminNavigation {
            padding:
              10px 8px 14px;
          }

          .navigationInner {
            width: 100%;
            gap: 9px;
          }

          .navButton {
            min-width: 135px;
            height: 46px;

            padding: 0 14px;

            font-size: 14px;
          }
        }
      `}</style>
    </>
  );
}
