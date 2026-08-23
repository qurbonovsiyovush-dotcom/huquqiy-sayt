"use client";

import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Document,
  Page,
  pdfjs,
} from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

/*
  PDF.js worker.
  Next.js + react-pdf uchun shu usul qulay.
*/
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type UserRole = "admin" | "user" | null;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function PdfViewerPage({
  params,
}: PageProps) {
  const { id } = use(params);

  const [role, setRole] =
    useState<UserRole>(null);

  const [roleLoading, setRoleLoading] =
    useState(true);

  const [numPages, setNumPages] =
    useState(0);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [scale, setScale] =
    useState(1.15);

  const [loadingError, setLoadingError] =
    useState("");

  const [downloading, setDownloading] =
    useState(false);

  const [pdfData, setPdfData] =
    useState<Uint8Array | null>(null);

  const [pdfLoading, setPdfLoading] =
    useState(true);

  const pdfUrl = useMemo(() => {
    return (
      `/api/kazuslar/pdf?id=` +
      encodeURIComponent(id)
    );
  }, [id]);

  /*
    Admin / user rolini aniqlash.
  */
  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        const response =
          await fetch(
            "/api/me",
            {
              method: "GET",
              cache: "no-store",
              credentials:
                "include",
            }
          );

        if (
          response.status ===
          401
        ) {
          window.location.replace(
            "/login"
          );

          return;
        }

        if (
          !response.ok
        ) {
          throw new Error(
            "Foydalanuvchi rolini aniqlab bo‘lmadi."
          );
        }

        const data =
          await response.json();

        if (
          cancelled
        ) {
          return;
        }

        setRole(
          data.role === "admin"
            ? "admin"
            : "user"
        );
      } catch (
        error
      ) {
        console.error(
          "ROLE ERROR:",
          error
        );

        if (
          !cancelled
        ) {
          setRole("user");
        }
      } finally {
        if (
          !cancelled
        ) {
          setRoleLoading(
            false
          );
        }
      }
    }

    loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        setPdfLoading(true);
        setLoadingError("");

        const response = await fetch(
          pdfUrl,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          }
        );

        if (!response.ok) {
          let message =
            "PDF faylni ochib bo‘lmadi.";

          try {
            const data = await response.json();

            if (
              data &&
              typeof data.error === "string"
            ) {
              message = data.error;
            }
          } catch {
            // JSON bo‘lmasa, umumiy xabar qoladi.
          }

          throw new Error(message);
        }

        const contentType =
          response.headers.get(
            "content-type"
          ) ?? "";

        if (
          !contentType
            .toLowerCase()
            .includes("application/pdf")
        ) {
          throw new Error(
            "Server PDF fayl qaytarmadi."
          );
        }

        const buffer =
          await response.arrayBuffer();

        if (
          cancelled
        ) {
          return;
        }

        setPdfData(
          new Uint8Array(
            buffer
          )
        );
      } catch (
        error
      ) {
        console.error(
          "PDF FETCH ERROR:",
          error
        );

        if (
          !cancelled
        ) {
          setPdfData(null);

          setLoadingError(
            error instanceof Error
              ? error.message
              : "PDF faylni ochib bo‘lmadi."
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setPdfLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  /*
    Oddiy foydalanuvchida:
    Ctrl+C
    Ctrl+P
    Ctrl+S
    Ctrl+U
    context menu
    copy
    drag
    cheklanadi.

    Admin uchun bu cheklovlarni yengillashtiramiz.
  */
  useEffect(() => {
    if (
      roleLoading ||
      role === "admin"
    ) {
      return;
    }

    function blockKeyboard(
      event: KeyboardEvent
    ) {
      const key =
        event.key.toLowerCase();

      const ctrl =
        event.ctrlKey ||
        event.metaKey;

      if (
        ctrl &&
        (
          key === "c" ||
          key === "p" ||
          key === "s" ||
          key === "u"
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (
        event.key ===
        "PrintScreen"
      ) {
        /*
          Screenshotni 100% bloklab bo‘lmaydi.
          Bu faqat oddiy urinishga qarshi.
        */
        event.preventDefault();
      }
    }

    function blockContextMenu(
      event: MouseEvent
    ) {
      event.preventDefault();
    }

    function blockCopy(
      event: ClipboardEvent
    ) {
      event.preventDefault();
    }

    function blockDrag(
      event: DragEvent
    ) {
      event.preventDefault();
    }

    window.addEventListener(
      "keydown",
      blockKeyboard,
      true
    );

    document.addEventListener(
      "contextmenu",
      blockContextMenu,
      true
    );

    document.addEventListener(
      "copy",
      blockCopy,
      true
    );

    document.addEventListener(
      "dragstart",
      blockDrag,
      true
    );

    return () => {
      window.removeEventListener(
        "keydown",
        blockKeyboard,
        true
      );

      document.removeEventListener(
        "contextmenu",
        blockContextMenu,
        true
      );

      document.removeEventListener(
        "copy",
        blockCopy,
        true
      );

      document.removeEventListener(
        "dragstart",
        blockDrag,
        true
      );
    };
  }, [
    role,
    roleLoading,
  ]);

  const onDocumentLoadSuccess =
    useCallback(
      ({
        numPages,
      }: {
        numPages: number;
      }) => {
        setNumPages(
          numPages
        );

        setCurrentPage(
          1
        );

        setLoadingError(
          ""
        );
      },
      []
    );

  const onDocumentLoadError =
    useCallback(
      (
        error: Error
      ) => {
        console.error(
          "PDF LOAD ERROR:",
          error
        );

        setLoadingError(
          "PDF faylni ochib bo‘lmadi."
        );
      },
      []
    );

  function goBack() {
    window.location.href =
      "/talabalar/kazuslar";
  }

  function previousPage() {
    setCurrentPage(
      (page) =>
        Math.max(
          1,
          page - 1
        )
    );
  }

  function nextPage() {
    setCurrentPage(
      (page) =>
        Math.min(
          numPages || 1,
          page + 1
        )
    );
  }

  function zoomOut() {
    setScale(
      (value) =>
        Math.max(
          0.7,
          Number(
            (
              value -
              0.1
            ).toFixed(2)
          )
        )
    );
  }

  function zoomIn() {
    setScale(
      (value) =>
        Math.min(
          2,
          Number(
            (
              value +
              0.1
            ).toFixed(2)
          )
        )
    );
  }

  /*
    Admin uchun yuklab olish.

    Keyingi bosqichda /api/kazuslar/pdf route.ts ichida
    download=1 ni faqat admin uchun ruxsat qilamiz.
  */
  async function downloadPdf() {
    if (
      role !== "admin" ||
      downloading
    ) {
      return;
    }

    try {
      setDownloading(
        true
      );

      const response =
        await fetch(
          `${pdfUrl}&download=1`,
          {
            method: "GET",
            cache: "no-store",
            credentials:
              "include",
          }
        );

      if (
        !response.ok
      ) {
        throw new Error(
          "PDFni yuklab bo‘lmadi."
        );
      }

      const blob =
        await response.blob();

      const objectUrl =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        objectUrl;

      anchor.download =
        `kazus-${id}.pdf`;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        objectUrl
      );
    } catch (
      error
    ) {
      console.error(
        "DOWNLOAD ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "PDFni yuklab bo‘lmadi."
      );
    } finally {
      setDownloading(
        false
      );
    }
  }

  return (
    <main
      className={
        role === "admin"
          ? "page adminPage"
          : "page protectedPage"
      }
      onContextMenu={(
        event
      ) => {
        if (
          role !== "admin"
        ) {
          event.preventDefault();
        }
      }}
      onCopy={(
        event
      ) => {
        if (
          role !== "admin"
        ) {
          event.preventDefault();
        }
      }}
    >
      <header className="topPanel">
        <div className="titlePlate">
          PDF kazus
        </div>

        <div className="topActions">
          {!roleLoading &&
            role === "admin" && (
              <button
                className="adminDownloadButton"
                type="button"
                onClick={
                  downloadPdf
                }
                disabled={
                  downloading
                }
              >
                {downloading
                  ? "Yuklanmoqda..."
                  : "PDF yuklab olish"}
              </button>
            )}

          <button
            className="backButton"
            type="button"
            onClick={
              goBack
            }
          >
            Orqaga
          </button>
        </div>
      </header>

      <section className="viewerShell">
        <div className="viewerTitle">
          Kazusni ko‘rish
        </div>

        <div className="toolbar">
          <button
            type="button"
            className="toolButton"
            onClick={
              previousPage
            }
            disabled={
              currentPage <= 1
            }
          >
            ←
          </button>

          <div className="pageCounter">
            <input
              value={
                currentPage
              }
              onChange={(
                event
              ) => {
                const value =
                  Number(
                    event
                      .target
                      .value
                  );

                if (
                  Number.isFinite(
                    value
                  )
                ) {
                  setCurrentPage(
                    Math.min(
                      Math.max(
                        1,
                        value
                      ),
                      numPages ||
                        1
                    )
                  );
                }
              }}
              inputMode="numeric"
              aria-label="Sahifa"
            />

            <span>
              /{" "}
              {numPages ||
                "..."}
            </span>
          </div>

          <button
            type="button"
            className="toolButton"
            onClick={
              nextPage
            }
            disabled={
              currentPage >=
              numPages
            }
          >
            →
          </button>

          <div className="divider" />

          <button
            type="button"
            className="toolButton"
            onClick={
              zoomOut
            }
          >
            −
          </button>

          <div className="zoomText">
            {Math.round(
              scale *
                100
            )}
            %
          </div>

          <button
            type="button"
            className="toolButton"
            onClick={
              zoomIn
            }
          >
            +
          </button>

          <div className="toolbarInfo">
            {role === "admin"
              ? "Administrator rejimi"
              : "Faqat o‘qish rejimi"}
          </div>
        </div>

        <div
          className="documentArea"
          onMouseDown={(
            event
          ) => {
            if (
              role !== "admin"
            ) {
              event.preventDefault();
            }
          }}
        >
          {pdfLoading ? (
            <div className="loadingBox">
              PDF yuklanmoqda...
            </div>
          ) : loadingError ? (
            <div className="errorBox">
              {loadingError}
            </div>
          ) : !pdfData ? (
            <div className="errorBox">
              PDF ma’lumotlari topilmadi.
            </div>
          ) : (
            <Document
              file={
                pdfData
                  ? { data: pdfData }
                  : undefined
              }
              onLoadSuccess={
                onDocumentLoadSuccess
              }
              onLoadError={
                onDocumentLoadError
              }
              loading={
                <div className="loadingBox">
                  PDF yuklanmoqda...
                </div>
              }
              error={
                <div className="errorBox">
                  PDF faylni ochib bo‘lmadi.
                </div>
              }
            >
              <div className="pageWrapper">
                <Page
                  pageNumber={
                    currentPage
                  }
                  scale={
                    scale
                  }

                  /*
                    Text layerni o‘chirib qo‘yamiz:
                    foydalanuvchi PDF matnini belgilay olmaydi.
                  */
                  renderTextLayer={
                    role === "admin"
                  }

                  /*
                    Annotation/link layer ham oddiy userda o‘chiq.
                  */
                  renderAnnotationLayer={
                    role === "admin"
                  }
                />
              </div>
            </Document>
          )}
        </div>

        {!roleLoading &&
          role !== "admin" && (
            <div className="notice">
              Ushbu hujjat faqat o‘qish uchun taqdim etilgan.
              Yuklab olish, chop etish va matnni nusxalash imkoniyatlari cheklangan.
            </div>
          )}
      </section>

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          background: #eef2f5;
        }

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 20px;
          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eef2f5 100%
            );
        }

        .protectedPage {
          -webkit-user-select: none;
          user-select: none;
        }

        .topPanel {
          width: 100%;
          min-height: 110px;

          padding: 22px 28px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          border: 3px solid #173e58;
          border-radius: 26px;

          background:
            linear-gradient(
              180deg,
              #8bd3ff 0%,
              #69b7e8 45%,
              #4999ce 100%
            );

          box-shadow:
            inset 0 6px 6px rgba(255,255,255,.75),
            inset 0 -7px 7px rgba(0,0,0,.18),
            0 7px 0 #173c55,
            0 12px 18px rgba(0,0,0,.22);
        }

        .titlePlate {
          min-width: 330px;
          padding: 16px 25px;

          text-align: center;

          font-size: 27px;
          font-weight: 700;

          border: 3px solid #42494e;
          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #f7f7f7,
              #dedede 30%,
              #b9b9b9 70%,
              #9f9f9f
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.95),
            inset 0 -6px 6px rgba(0,0,0,.2),
            0 5px 0 #4b5256;
        }

        .topActions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .backButton,
        .adminDownloadButton {
          min-height: 55px;
          padding: 0 22px;

          border-radius: 13px;

          cursor: pointer;

          font-family: inherit;
          font-size: 16px;
          font-weight: 700;

          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.9),
            0 5px 0 rgba(0,0,0,.38);
        }

        .backButton {
          min-width: 140px;

          border: 3px solid #464c50;

          background:
            linear-gradient(
              #f8f8f8,
              #b7b7b7
            );
        }

        .adminDownloadButton {
          border: 3px solid #174461;

          color: #073b68;

          background:
            linear-gradient(
              #a4deff,
              #54a8db
            );
        }

        .adminDownloadButton:disabled {
          opacity: .65;
          cursor: wait;
        }

        .viewerShell {
          position: relative;

          width: min(
            1450px,
            97%
          );

          margin:
            75px auto
            40px;

          padding:
            70px 25px
            30px;

          border: 3px solid #303538;
          border-radius: 27px;

          background:
            linear-gradient(
              145deg,
              #686c6f,
              #505457 45%,
              #363a3d
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.23),
            inset 0 -8px 8px rgba(0,0,0,.32),
            0 7px 0 #272b2e,
            0 15px 24px rgba(0,0,0,.3);
        }

        .viewerTitle {
          position: absolute;

          top: -33px;
          left: 50%;

          transform:
            translateX(-50%);

          min-width: 330px;
          min-height: 62px;

          padding:
            12px 28px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #073b68;

          font-size: 25px;
          font-weight: 700;

          border: 3px solid #174461;
          border-radius: 14px;

          background:
            linear-gradient(
              #9bd9ff,
              #4e9ccc
            );

          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.7),
            0 5px 0 #17415c;
        }

        .toolbar {
          max-width: 1150px;

          margin:
            0 auto
            20px;

          min-height: 64px;

          padding:
            10px 16px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 12px;

          border: 2px solid #3b4246;
          border-radius: 14px;

          background:
            linear-gradient(
              #eeeeee,
              #b6b6b6
            );

          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.8),
            0 5px 0 #343a3e;
        }

        .toolButton {
          width: 46px;
          height: 42px;

          border: 2px solid #4e565b;
          border-radius: 8px;

          cursor: pointer;

          font-family: inherit;
          font-size: 22px;
          font-weight: 700;

          background:
            linear-gradient(
              #ffffff,
              #c1c1c1
            );
        }

        .toolButton:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .pageCounter {
          display: flex;
          align-items: center;
          gap: 8px;

          font-size: 17px;
          font-weight: 700;
        }

        .pageCounter input {
          width: 58px;
          height: 40px;

          padding: 5px;

          text-align: center;

          border: 2px solid #555;
          border-radius: 7px;

          font-family: inherit;
          font-size: 17px;
          font-weight: 700;

          background: white;
        }

        .zoomText {
          min-width: 55px;
          text-align: center;
          font-weight: 700;
        }

        .divider {
          width: 2px;
          height: 34px;
          background: #777;
          margin: 0 4px;
        }

        .toolbarInfo {
          margin-left: auto;

          padding:
            8px 13px;

          border-radius: 20px;

          background: #dceffd;
          color: #073b68;

          font-size: 14px;
          font-weight: 700;
        }

        .documentArea {
          min-height: 650px;

          padding:
            30px 15px;

          overflow: auto;

          display: flex;
          justify-content: center;
          align-items: flex-start;

          border: 3px solid #454c50;
          border-radius: 16px;

          background: #25282a;

          box-shadow:
            inset 0 5px 10px rgba(0,0,0,.55);
        }

        .pageWrapper {
          display: inline-block;

          background: white;

          box-shadow:
            0 6px 20px rgba(0,0,0,.5);
        }

        .react-pdf__Page__canvas {
          display: block;
          max-width: none !important;
        }

        /*
          Oddiy foydalanuvchi uchun canvas interaction
          va selection cheklovi.
        */
        .protectedPage .documentArea,
        .protectedPage .react-pdf__Page,
        .protectedPage .react-pdf__Page__canvas {
          -webkit-user-select: none !important;
          user-select: none !important;

          -webkit-touch-callout: none;

          cursor: default;
        }

        .protectedPage .react-pdf__Page__textContent,
        .protectedPage .react-pdf__Page__annotations {
          display: none !important;
        }

        .loadingBox,
        .errorBox {
          min-width: 300px;

          padding: 25px;

          text-align: center;

          border-radius: 12px;

          font-size: 18px;
          font-weight: 700;
        }

        .loadingBox {
          color: #073b68;
          background: #dceffd;
        }

        .errorBox {
          color: #8a1e1e;
          background: #f9dddd;
          border: 2px solid #a63a3a;
        }

        .notice {
          max-width: 1050px;

          margin:
            22px auto
            0;

          padding:
            14px 18px;

          text-align: center;

          border: 2px solid #6c7377;
          border-radius: 11px;

          color: #26343c;
          background: #d8dcde;

          font-size: 15px;
          font-weight: 700;
        }

        @media (
          max-width: 900px
        ) {
          .page {
            padding: 10px;
          }

          .topPanel {
            flex-direction: column;
            padding: 18px;
          }

          .titlePlate {
            min-width: 0;
            width: 100%;
            font-size: 22px;
          }

          .topActions {
            width: 100%;
            flex-direction: column;
          }

          .backButton,
          .adminDownloadButton {
            width: 100%;
          }

          .viewerShell {
            width: 100%;
            padding:
              65px 10px
              20px;
          }

          .viewerTitle {
            min-width: 250px;
            max-width: 90%;

            text-align: center;
            font-size: 20px;
          }

          .toolbar {
            flex-wrap: wrap;
          }

          .toolbarInfo {
            width: 100%;
            margin-left: 0;
            text-align: center;
          }

          .documentArea {
            min-height: 500px;
            padding: 15px 5px;
          }
        }
      `}</style>
    </main>
  );
}
