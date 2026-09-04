"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

type PublicTest = {
  id: string;
  title: string;
  subject?: string;
  description?: string;
  duration?: number;
  testType?: string;
  questionCount?: number;
  attemptLimit?: number | null;
  status?: string;
};

type LessonRow = {
  lessonNumber: number;
  title: string;
  test: PublicTest | null;
};

function normalizeTitle(
  value: string
) {
  return String(value || "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function lessonNumberFromTitle(
  title: string
) {
  const normalized =
    normalizeTitle(title);

  /*
    Saqlangan title misoli:
    Davlat va huquq asoslari 10-sinf — 1-DARS. ...
  */
  const match =
    normalized.match(
      /(?:^|\s|[-])(\d{1,2})-DARS\./i
    );

  if (!match) {
    return null;
  }

  const value =
    Number(match[1]);

  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > 200
  ) {
    return null;
  }

  return value;
}

function lessonLabelFromTitle(
  title: string,
  lessonNumber: number
) {
  const normalized =
    String(title || "")
      .replace(/\s+/g, " ")
      .trim();

  const marker =
    new RegExp(
      `${lessonNumber}\\s*-\\s*DARS\\.`,
      "i"
    );

  const match =
    normalized.match(marker);

  if (!match || match.index == null) {
    return `${lessonNumber}-DARS`;
  }

  return normalized
    .slice(match.index)
    .replace(/[–—]/g, "-")
    .trim();
}

function isControlTest(
  title: string
) {
  return /nazorat\s+savollari/i.test(
    title
  );
}

function isGlossaryTest(
  title: string
) {
  return (
    /izohli\s+lug['‘’ʻʼ`´]?ati/i.test(
      title
    ) ||
    /yuridik\s+atamalar/i.test(
      title
    )
  );
}

export default function ThematicGradePage() {
  const router = useRouter();
  const params = useParams();

  const grade =
    typeof params?.grade === "string"
      ? Number(params.grade)
      : NaN;

  const supportedGrade =
    [8, 9, 10, 11].includes(grade)
      ? grade
      : null;

  const [tests, setTests] =
    useState<PublicTest[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/tests/public-list",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.message ||
              "Testlarni yuklab bo‘lmadi."
          );
        }

        const all =
          Array.isArray(data.tests)
            ? data.tests
            : [];

        const thematic =
          all.filter(
            (test: PublicTest) => {
              if (
                test?.testType !==
                "thematic"
              ) {
                return false;
              }

              if (!supportedGrade) {
                return false;
              }

              const haystack =
                `${test.title || ""} ${test.subject || ""}`
                  .toLowerCase();

              return (
                haystack.includes(
                  `${supportedGrade}-sinf`
                ) ||
                haystack.includes(
                  `${supportedGrade} sinf`
                )
              );
            }
          );

        if (!cancelled) {
          setTests(thematic);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Testlarni yuklashda xatolik."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [supportedGrade]);

  const lessonRows =
    useMemo<LessonRow[]>(() => {
      const byLesson =
        new Map<
          number,
          PublicTest
        >();

      for (const test of tests) {
        const number =
          lessonNumberFromTitle(
            test.title
          );

        if (
          number !== null &&
          !byLesson.has(number)
        ) {
          byLesson.set(
            number,
            test
          );
        }
      }

      return Array.from(
        byLesson.entries()
      )
        .sort(
          ([a], [b]) => a - b
        )
        .map(
          ([lessonNumber, test]) => ({
            lessonNumber,
            title:
              lessonLabelFromTitle(
                test.title,
                lessonNumber
              ),
            test,
          })
        );
    }, [tests]);

  const controlTest =
    useMemo(
      () =>
        tests.find((test) =>
          isControlTest(test.title)
        ) || null,
      [tests]
    );

  const glossaryTest =
    useMemo(
      () =>
        tests.find((test) =>
          isGlossaryTest(test.title)
        ) || null,
      [tests]
    );

  function openTest(
    test: PublicTest | null
  ) {
    if (!test?.id) {
      return;
    }

    router.push(
      `/test/${encodeURIComponent(
        test.id
      )}`
    );
  }

  return (
    <main className="page">
      <div className="shell">
        <button
          type="button"
          className="backButton"
          onClick={() =>
            router.push("/test/thematic")
          }
        >
          ← Testlar
        </button>

        <section className="titlePlate">
          <div className="titleMain">
            Davlat va huquq asoslari
            {supportedGrade
              ? ` ${supportedGrade}-sinf`
              : ""}
          </div>

          <div className="titleSub">
            (Mavzulashtirilgan test)
          </div>
        </section>

        {!supportedGrade && (
          <div className="errorBox">
            Faqat 8, 9, 10 va 11-sinflar qo‘llab-quvvatlanadi.
          </div>
        )}

        {supportedGrade &&
          loading && (
            <div className="statusBox">
              Mavzular yuklanmoqda...
            </div>
          )}

        {supportedGrade &&
          error && (
          <div className="errorBox">
            {error}
          </div>
        )}

        {supportedGrade &&
          !loading &&
          !error && (
            <>
              {lessonRows.length === 0 &&
                !controlTest &&
                !glossaryTest && (
                  <div className="statusBox">
                    Bu sinf bo‘yicha hozircha e’lon qilingan mavzulashtirilgan test yo‘q.
                  </div>
                )}

              <section className="lessonList">
                {lessonRows.map(
                  (row) => {
                    const available =
                      Boolean(
                        row.test?.id
                      );

                    return (
                      <button
                        key={
                          row.lessonNumber
                        }
                        type="button"
                        className={`lessonButton ${
                          available
                            ? "available"
                            : "disabled"
                        }`}
                        disabled={
                          !available
                        }
                        onClick={() =>
                          openTest(
                            row.test
                          )
                        }
                      >
                        <span className="lessonNo">
                          {
                            row.lessonNumber
                          }
                        </span>

                        <span className="lessonText">
                          {row.title}

                          {!available && (
                            <small>
                              Hali e’lon
                              qilinmagan
                            </small>
                          )}
                        </span>

                        <span className="lessonMeta">
                          {available
                            ? `${
                                row.test
                                  ?.questionCount ??
                                0
                              } ta savol`
                            : "—"}
                        </span>
                      </button>
                    );
                  }
                )}
              </section>

              {(controlTest ||
                glossaryTest) && (
              <section className="extraSection">
                <div className="extraTitle">
                  Qo‘shimcha bo‘limlar
                </div>

                {controlTest && (
                <button
                  type="button"
                  className="lessonButton extraButton available"
                  onClick={() =>
                    openTest(
                      controlTest
                    )
                  }
                >
                  <span className="lessonNo">
                    N
                  </span>

                  <span className="lessonText">
                    Nazorat savollari

                    {!controlTest && (
                      <small>
                        Hali e’lon
                        qilinmagan
                      </small>
                    )}
                  </span>

                  <span className="lessonMeta">
                    {controlTest
                      ? `${
                          controlTest.questionCount ??
                          0
                        } ta savol`
                      : "—"}
                  </span>
                </button>
                )}

                {glossaryTest && (
                <button
                  type="button"
                  className="lessonButton extraButton available"
                  onClick={() =>
                    openTest(
                      glossaryTest
                    )
                  }
                >
                  <span className="lessonNo">
                    L
                  </span>

                  <span className="lessonText">
                    Ayrim yuridik
                    atamalarning izohli
                    lug‘ati

                    {!glossaryTest && (
                      <small>
                        Hali e’lon
                        qilinmagan
                      </small>
                    )}
                  </span>

                  <span className="lessonMeta">
                    {glossaryTest
                      ? `${
                          glossaryTest.questionCount ??
                          0
                        } ta savol`
                      : "—"}
                  </span>
                </button>
                )}
              </section>
              )}
            </>
          )}
      </div>

      <style jsx>{`
        * {
          box-sizing:
            border-box;
        }

        .page {
          min-height: 100vh;
          padding:
            38px 18px 70px;
          background:
            linear-gradient(
              180deg,
              #d7edf8 0%,
              #c5e0ee 45%,
              #d9eef7 100%
            );
          color: #17242b;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
        }

        .shell {
          width:
            min(
              1120px,
              100%
            );
          margin: 0 auto;
        }

        .backButton {
          margin-bottom: 24px;
          padding:
            10px 18px;
          border:
            2px solid
            #324b58;
          border-radius:
            10px;
          background:
            linear-gradient(
              180deg,
              #f7f9fa,
              #d6dde1
            );
          box-shadow:
            inset 0 2px 0
              #ffffff,
            0 5px 0
              #667780;
          color: #203641;
          font-family:
            inherit;
          font-weight: 900;
          cursor: pointer;
        }

        .backButton:active {
          transform:
            translateY(3px);
          box-shadow:
            inset 0 2px 0
              #ffffff,
            0 2px 0
              #667780;
        }

        .titlePlate {
          width: 100%;
          margin:
            0 auto 34px;
          padding:
            24px 24px
            21px;
          border:
            3px solid
            #40545e;
          border-radius:
            16px;
          background:
            linear-gradient(
              180deg,
              #e7eaec 0%,
              #c6cccf 100%
            );
          box-shadow:
            inset 0 3px 0
              rgba(
                255,
                255,
                255,
                0.9
              ),
            0 8px 0
              #64737a,
            0 15px 25px
              rgba(
                0,
                0,
                0,
                0.15
              );
          text-align:
            center;
        }

        .titleMain {
          font-size:
            clamp(
              24px,
              3vw,
              34px
            );
          font-weight: 900;
          line-height: 1.2;
        }

        .titleSub {
          margin-top: 7px;
          font-size:
            clamp(
              17px,
              2vw,
              22px
            );
          font-weight: 800;
          color: #3d4c53;
        }

        .statusBox,
        .errorBox {
          margin-top: 20px;
          padding: 18px;
          border-radius:
            12px;
          background: white;
          box-shadow:
            0 4px 0
              #7d8d94;
          text-align:
            center;
          font-weight: 900;
        }

        .errorBox {
          border:
            2px solid
            #9b3a3a;
          color: #7a2020;
        }

        .lessonList {
          display: grid;
          gap: 14px;
        }

        .lessonButton {
          width: 100%;
          min-height: 72px;
          display: grid;
          grid-template-columns:
            52px
            minmax(
              0,
              1fr
            )
            auto;
          align-items:
            center;
          gap: 15px;
          padding:
            11px 16px;
          border:
            3px solid
            #285b77;
          border-radius:
            13px;
          background:
            linear-gradient(
              180deg,
              #8bd5fb 0%,
              #55b6e8 54%,
              #3595c7 100%
            );
          box-shadow:
            inset 0 3px 0
              rgba(
                255,
                255,
                255,
                0.72
              ),
            inset 0 -2px 0
              rgba(
                0,
                0,
                0,
                0.12
              ),
            0 7px 0
              #205b7b,
            0 12px 18px
              rgba(
                0,
                0,
                0,
                0.15
              );
          color: #102d3c;
          font-family:
            inherit;
          text-align:
            left;
          transition:
            transform
              0.08s ease;
        }

        .lessonButton.available {
          cursor: pointer;
        }

        .lessonButton.available:hover {
          filter:
            brightness(
              1.025
            );
        }

        .lessonButton.available:active {
          transform:
            translateY(4px);
          box-shadow:
            inset 0 3px 0
              rgba(
                255,
                255,
                255,
                0.68
              ),
            0 3px 0
              #205b7b;
        }

        .lessonButton.disabled {
          border-color:
            #68767d;
          background:
            linear-gradient(
              180deg,
              #d8dde0,
              #bcc4c8
            );
          box-shadow:
            inset 0 2px 0
              #f4f5f6,
            0 5px 0
              #747f84;
          color: #5f696e;
          cursor:
            not-allowed;
        }

        .lessonNo {
          width: 44px;
          height: 44px;
          display: grid;
          place-items:
            center;
          border:
            2px solid
            rgba(
              22,
              62,
              82,
              0.52
            );
          border-radius:
            10px;
          background:
            rgba(
              255,
              255,
              255,
              0.5
            );
          box-shadow:
            inset 0 2px 0
              rgba(
                255,
                255,
                255,
                0.75
              );
          font-size: 17px;
          font-weight: 900;
        }

        .lessonText {
          min-width: 0;
          font-size:
            clamp(
              16px,
              2vw,
              20px
            );
          font-weight: 900;
          line-height: 1.25;
        }

        .lessonText small {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          font-weight: 700;
          opacity: 0.8;
        }

        .lessonMeta {
          min-width: 92px;
          padding:
            8px 10px;
          border-radius:
            9px;
          background:
            rgba(
              255,
              255,
              255,
              0.55
            );
          font-size: 13px;
          font-weight: 900;
          text-align:
            center;
          white-space:
            nowrap;
        }

        .extraSection {
          margin-top: 36px;
          padding:
            28px 20px
            22px;
          border:
            3px solid
            #44575f;
          border-radius:
            16px;
          background:
            linear-gradient(
              180deg,
              #e5e8e9,
              #cbd1d4
            );
          box-shadow:
            inset 0 3px 0
              white,
            0 7px 0
              #67767d;
        }

        .extraTitle {
          width:
            fit-content;
          margin:
            -48px auto
            22px;
          padding:
            10px 22px;
          border:
            2px solid
            #445b67;
          border-radius:
            10px;
          background:
            linear-gradient(
              180deg,
              #f7f9fa,
              #d5dde1
            );
          box-shadow:
            inset 0 2px 0
              white,
            0 5px 0
              #687780;
          font-size: 18px;
          font-weight: 900;
        }

        .extraButton +
        .extraButton {
          margin-top: 14px;
        }

        @media (
          max-width:
            680px
        ) {
          .page {
            padding:
              24px 11px
              50px;
          }

          .titlePlate {
            padding:
              19px 13px;
          }

          .lessonButton {
            grid-template-columns:
              42px
              minmax(
                0,
                1fr
              );
            gap: 11px;
            padding:
              10px 11px;
          }

          .lessonNo {
            width: 38px;
            height: 38px;
          }

          .lessonMeta {
            grid-column: 2;
            width:
              fit-content;
            min-width: 0;
            margin-top: 2px;
          }

          .extraSection {
            padding:
              26px 12px
              16px;
          }
        }
      `}</style>
    </main>
  );
}
