"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type TestCategory =
  | "legislation"
  | "thematic"
  | "block"
  | "national-certificate"
  | "thirty"
  | "custom";

type PublicTest = {
  id: string;
  title: string;
  subject: string;
  description: string;
  duration: number;
  testType: TestCategory;
  customTestTypeName?: string;
  questionCount: number;
  attemptLimit:
    | number
    | null;
  updatedAt?: string;
  source?:
    | "classic"
    | "thematic"
    | "national-certificate";
};

const CATEGORIES: Array<{
  key: TestCategory;
  title: string;
  icon: string;
}> = [
  {
    key: "legislation",
    title:
      "Qonunchilik hujjatlaridan test",
    icon: "§",
  },
  {
    key: "thematic",
    title:
      "Mavzulashtirilgan test",
    icon: "M",
  },
  {
    key: "block",
    title: "Blok test",
    icon: "B",
  },
  {
    key:
      "national-certificate",
    title:
      "Milliy sertifikat testi",
    icon: "MS",
  },
  {
    key: "thirty",
    title: "30 talik test",
    icon: "30",
  },
  {
    key: "custom",
    title: "Boshqa test",
    icon: "+",
  },
];

async function readJson(
  response: Response
) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function normalizeNationalTests(
  value: unknown
): PublicTest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((raw: any) => {
      const id =
        String(
          raw?.id || ""
        );

      if (!id) {
        return null;
      }

      return {
        id,
        title:
          String(
            raw?.title ||
              "Milliy sertifikat testi"
          ),
        subject:
          String(
            raw?.subject ||
              "Huquqshunoslik"
          ),
        description:
          String(
            raw?.description ||
              ""
          ),
        duration:
          Math.max(
            1,
            Number(
              raw?.durationMinutes ??
                raw?.duration_minutes ??
                raw?.duration
            ) || 90
          ),
        testType:
          "national-certificate" as const,
        questionCount:
          Math.max(
            45,
            Number(
              raw?.totalQuestions ??
                raw?.total_questions ??
                raw?.questionCount ??
                45
            ) || 45
          ),
        attemptLimit:
          raw?.attemptLimit ??
          raw?.attempt_limit ??
          null,
        updatedAt:
          raw?.updatedAt ??
          raw?.updated_at ??
          "",
        source:
          "national-certificate" as const,
      };
    })
    .filter(Boolean) as PublicTest[];
}

export default function TestPage() {
  const router = useRouter();

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState<TestCategory>(
      "legislation"
    );

  const [tests, setTests] =
    useState<PublicTest[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        /*
          Ikkala ro‘yxat parallel yuklanadi.
          Classic testlar: savollarsiz yengil metadata endpoint.
          Milliy sertifikat: Neon public endpoint.
        */
        const [
          classicResponse,
          nationalResponse,
        ] =
          await Promise.all([
            fetch(
              "/api/tests/public-list",
              {
                method: "GET",
                cache:
                  "no-store",
              }
            ),
            fetch(
              "/api/national-certificate/tests",
              {
                method: "GET",
                cache:
                  "no-store",
              }
            ).catch(
              () => null
            ),
          ]);

        const classicData =
          await readJson(
            classicResponse
          );

        if (
          !classicResponse.ok ||
          !classicData.success
        ) {
          throw new Error(
            classicData.message ||
              "Testlarni yuklab bo‘lmadi."
          );
        }

        const classicTests:
          PublicTest[] =
          Array.isArray(
            classicData.tests
          )
            ? classicData.tests.map(
                (test: any) => ({
                  ...test,
                  source:
                    test?.source === "thematic"
                      ? ("thematic" as const)
                      : ("classic" as const),
                })
              )
            : [];

        let nationalTests:
          PublicTest[] = [];

        if (
          nationalResponse &&
          nationalResponse.ok
        ) {
          const nationalData =
            await readJson(
              nationalResponse
            );

          /*
            API turli wrapper ishlatishi mumkin:
            tests yoki data.
          */
          nationalTests =
            normalizeNationalTests(
              nationalData.tests ??
                nationalData.data ??
                []
            );
        }

        /*
          Neon public ro‘yxati va Milliy sertifikat ro‘yxati
          birlashtirilganda duplicate id bo‘lmasligi uchun Set.
        */
        const merged =
          [
            ...classicTests,
            ...nationalTests,
          ];

        const seen =
          new Set<string>();

        const unique =
          merged.filter(
            (test) => {
              const key = `${
                test.source
              }:${test.id}`;

              if (
                seen.has(key)
              ) {
                return false;
              }

              seen.add(key);
              return true;
            }
          );

        if (!cancelled) {
          setTests(unique);
        }
      } catch (err) {
        if (!cancelled) {
          setTests([]);

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

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryCounts =
    useMemo(() => {
      const result:
        Record<
          TestCategory,
          number
        > = {
        legislation: 0,
        thematic: 0,
        block: 0,
        "national-certificate": 0,
        thirty: 0,
        custom: 0,
      };

      for (const test of tests) {
        result[
          test.testType
        ] += 1;
      }

      return result;
    }, [tests]);

  const visibleTests =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return tests.filter(
        (test) => {
          if (
            test.testType !==
            selectedCategory
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            test.title,
            test.subject,
            test.description,
            test.customTestTypeName,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      tests,
      selectedCategory,
      search,
    ]);

  function openTest(
    test: PublicTest
  ) {
    if (
      test.source ===
        "national-certificate" ||
      test.testType ===
        "national-certificate"
    ) {
      router.push(
        `/national-certificate/${encodeURIComponent(
          test.id
        )}`
      );

      return;
    }

    if (
      test.source === "thematic" ||
      test.testType === "thematic"
    ) {
      router.push(
        `/test/thematic/solve/${encodeURIComponent(
          test.id
        )}`
      );

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
      <header className="topBar">
        <div className="topLabel">
          Online testlar
        </div>

        <button
          type="button"
          onClick={() =>
            router.push("/")
          }
        >
          Asosiy sahifa
        </button>
      </header>

      <section className="mainBox">
        <div className="floatingTitle">
          Testlar
        </div>

        <div className="typesPanel">
          <div className="typesHeader">
            <div>
              <strong>
                Test turlari
              </strong>
              <span>
                Kerakli bo‘limni
                tanlang
              </span>
            </div>

            <div className="selectedName">
              {
                CATEGORIES.find(
                  (item) =>
                    item.key ===
                    selectedCategory
                )?.title
              }
            </div>
          </div>

          <div className="categoryGrid">
            {CATEGORIES.map(
              (category) => (
                <button
                  key={
                    category.key
                  }
                  type="button"
                  className={
                    selectedCategory ===
                    category.key
                      ? "category activeCategory"
                      : "category"
                  }
                  onClick={() => {
                    if (
                      category.key ===
                      "thematic"
                    ) {
                      router.push(
                        "/test/thematic"
                      );
                      return;
                    }

                    setSelectedCategory(
                      category.key
                    );
                    setSearch("");
                  }}
                >
                  <span className="categoryIcon">
                    {
                      category.icon
                    }
                  </span>

                  <strong>
                    {
                      category.title
                    }
                  </strong>

                  <span className="count">
                    {
                      categoryCounts[
                        category.key
                      ]
                    }
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        <div className="searchPanel">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target
                  .value
              )
            }
            placeholder="Test nomi yoki fan bo‘yicha qidirish..."
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
            >
              ×
            </button>
          )}
        </div>

        <section className="testsPanel">
          {loading ? (
            <div className="empty">
              <div className="loader" />
              <strong>
                Testlar yuklanmoqda...
              </strong>
            </div>
          ) : error ? (
            <div className="error">
              {error}
            </div>
          ) : visibleTests.length ===
            0 ? (
            <div className="empty">
              <strong>
                Hozircha ushbu
                bo‘limda e’lon
                qilingan test yo‘q.
              </strong>
            </div>
          ) : (
            <div className="testGrid">
              {visibleTests.map(
                (test) => (
                  <article
                    className="testCard"
                    key={`${test.source}:${test.id}`}
                  >
                    <div className="cardTop">
                      <span>
                        {test.subject ||
                          "Huquq"}
                      </span>

                      <b>
                        {
                          test.questionCount
                        }{" "}
                        savol
                      </b>
                    </div>

                    <h2>
                      {test.title}
                    </h2>

                    {test.description && (
                      <p>
                        {
                          test.description
                        }
                      </p>
                    )}

                    <div className="meta">
                      <span>
                        ⏱{" "}
                        {
                          test.duration
                        }{" "}
                        daqiqa
                      </span>

                      <span>
                        Urinish:{" "}
                        {test.attemptLimit ==
                        null
                          ? "cheklanmagan"
                          : test.attemptLimit}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="startButton"
                      onClick={() =>
                        openTest(
                          test
                        )
                      }
                    >
                      Testni boshlash
                    </button>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding:
            16px 16px 70px;
          box-sizing:
            border-box;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #eef3f6
            );
          color: #071d2e;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
        }

        .topBar {
          min-height: 56px;
          padding: 9px 14px;
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          border:
            2px solid #194e68;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              #85d6fa 0%,
              #4bb6e7 45%,
              #2196cc 100%
            );
          box-shadow:
            inset 0 4px 3px
              rgba(
                255,
                255,
                255,
                .75
              ),
            0 6px 0 #164a63,
            0 9px 15px
              rgba(
                0,
                0,
                0,
                .22
              );
        }

        .topLabel,
        .topBar button {
          padding:
            10px 24px;
          border:
            1.5px solid
            #526772;
          border-radius: 7px;
          background:
            linear-gradient(
              180deg,
              #fff,
              #d7d7d7
            );
          font-weight: 900;
        }

        .topBar button {
          cursor: pointer;
        }

        .mainBox {
          position: relative;
          width:
            min(
              1120px,
              96%
            );
          margin:
            70px auto 0;
          padding:
            64px 28px 32px;
          box-sizing:
            border-box;
          border:
            2px solid #323b40;
          border-radius: 22px;
          background:
            linear-gradient(
              180deg,
              #666b6e,
              #444a4d
            );
          box-shadow:
            inset 0 4px 3px
              rgba(
                255,
                255,
                255,
                .22
              ),
            0 9px 0 #262c2f,
            0 14px 22px
              rgba(
                0,
                0,
                0,
                .25
              );
        }

        .floatingTitle {
          position: absolute;
          top: -31px;
          left: 50%;
          transform:
            translateX(-50%);
          min-width: 250px;
          padding:
            14px 34px;
          text-align: center;
          border:
            2px solid #1a526d;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #9ce1ff,
              #4eb8e9 58%,
              #218ebf
            );
          box-shadow:
            inset 0 4px 3px
              rgba(
                255,
                255,
                255,
                .7
              ),
            0 6px 0 #31586b,
            0 9px 12px
              rgba(
                0,
                0,
                0,
                .25
              );
          font-size: 26px;
          font-weight: 900;
        }

        .typesPanel,
        .searchPanel,
        .testsPanel {
          padding: 16px;
          border:
            1.5px solid
            #637680;
          border-radius: 14px;
          background:
            linear-gradient(
              180deg,
              #f7fafb,
              #dbe3e7
            );
          box-shadow:
            inset 0 3px 2px
              #fff,
            0 5px 0 #75868e;
        }

        .typesHeader {
          margin-bottom: 14px;
          display: flex;
          justify-content:
            space-between;
          gap: 20px;
          align-items: center;
        }

        .typesHeader div:first-child {
          display: grid;
        }

        .typesHeader strong {
          font-size: 19px;
        }

        .typesHeader span {
          font-size: 12px;
        }

        .selectedName {
          padding:
            7px 12px;
          border:
            1px solid
            #657780;
          border-radius: 7px;
          background: #fff;
          font-size: 13px;
          font-weight: 800;
        }

        .categoryGrid {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0,1fr)
            );
          gap: 12px;
        }

        .category {
          position: relative;
          min-height: 95px;
          padding:
            14px 50px
            14px 14px;
          display: flex;
          align-items: center;
          gap: 13px;
          text-align: left;
          border:
            1.5px solid
            #6a7a82;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #f7f8f9,
              #d6dde1
            );
          box-shadow:
            inset 0 3px 2px
              #fff,
            0 5px 0 #6b767c;
          cursor: pointer;
        }

        .categoryIcon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border:
            1.5px solid
            #34647b;
          border-radius: 8px;
          background:
            linear-gradient(
              180deg,
              #e8f8ff,
              #89cae6
            );
          box-shadow:
            inset 0 2px 2px
              #fff,
            0 3px 0 #648493;
          font-weight: 900;
        }

        .count {
          position: absolute;
          right: 12px;
          top: 12px;
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border:
            1.5px solid
            #205c77;
          border-radius: 50%;
          background:
            #bfeaff;
          font-weight: 900;
        }

        .activeCategory {
          border-color:
            #087fb8;
          background:
            linear-gradient(
              180deg,
              #d8f5ff,
              #7fcaea
            );
          box-shadow:
            inset 0 3px 2px
              #fff,
            0 6px 0 #126787;
        }

        .searchPanel {
          margin-top: 24px;
          display: flex;
          gap: 10px;
        }

        .searchPanel input {
          width: 100%;
          min-height: 48px;
          padding:
            0 16px;
          border:
            1.5px solid
            #0b9cdf;
          border-radius: 8px;
          outline: none;
          background: #fff;
          font:
            16px Georgia,
            serif;
        }

        .searchPanel button {
          min-width: 50px;
          border:
            1px solid
            #65777f;
          border-radius: 8px;
          background:
            linear-gradient(
              #fff,
              #d8dde0
            );
          cursor: pointer;
          font-size: 22px;
        }

        .testsPanel {
          margin-top: 24px;
          min-height: 220px;
        }

        .testGrid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );
          gap: 14px;
        }

        .testCard {
          padding: 16px;
          border:
            1.5px solid
            #647983;
          border-radius: 13px;
          background:
            linear-gradient(
              180deg,
              #fff,
              #e1e6e9
            );
          box-shadow:
            inset 0 3px 2px
              #fff,
            0 5px 0 #7b898f;
        }

        .cardTop,
        .meta {
          display: flex;
          justify-content:
            space-between;
          gap: 10px;
          flex-wrap: wrap;
          font-size: 13px;
        }

        .cardTop span {
          padding:
            4px 9px;
          border-radius: 6px;
          background: #d8f2ff;
          font-weight: 800;
        }

        .testCard h2 {
          margin:
            14px 0 8px;
          font-size: 20px;
        }

        .testCard p {
          margin:
            0 0 14px;
          color: #43545c;
        }

        .meta {
          padding-top: 10px;
          border-top:
            1px solid
            #b4c0c5;
        }

        .startButton {
          width: 100%;
          margin-top: 14px;
          padding: 11px;
          border:
            1.5px solid
            #1e6380;
          border-radius: 8px;
          color: #08263a;
          background:
            linear-gradient(
              180deg,
              #bcecff,
              #55bee9
            );
          box-shadow:
            inset 0 3px 2px
              rgba(
                255,
                255,
                255,
                .75
              ),
            0 4px 0 #33748f;
          font-weight: 900;
          cursor: pointer;
        }

        .empty,
        .error {
          min-height: 190px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 12px;
          text-align: center;
        }

        .error {
          color: #8e1c1c;
        }

        .loader {
          width: 34px;
          height: 34px;
          border:
            4px solid #c6d3d9;
          border-top-color:
            #0793d3;
          border-radius: 50%;
          animation:
            spin .8s linear
            infinite;
        }

        @keyframes spin {
          to {
            transform:
              rotate(360deg);
          }
        }

        @media (
          max-width: 850px
        ) {
          .categoryGrid,
          .testGrid {
            grid-template-columns:
              1fr;
          }

          .typesHeader {
            align-items:
              stretch;
            flex-direction:
              column;
          }

          .mainBox {
            width: 100%;
            padding:
              55px 12px
              22px;
          }
        }
      `}</style>
    </main>
  );
}
