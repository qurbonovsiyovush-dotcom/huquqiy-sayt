async function saveDraft() {
  if (
    testType === "custom" &&
    !customTestTypeName.trim()
  ) {
    setMessage(
      "Boshqa test turi uchun test turining nomini kiriting."
    );
    return;
  }

  if (questions.length === 0) {
    setMessage(
      "Saqlash uchun savollar yo‘q."
    );
    return;
  }

  const invalid =
    questions.filter(
      (question) => {
        const correctCount =
          question.options.filter(
            (option) =>
              option.isCorrect
          ).length;

        return (
          !richTextHasContent(
            questionDrafts[
              question.id
            ] ??
              question.questionText
          ) ||
          question.options.some(
            (option) =>
              !richTextHasContent(
                option.text
              )
          ) ||
          correctCount !== 1
        );
      }
    );

  if (invalid.length > 0) {
    setMessage(
      `${invalid.length} ta savolda xato bor. Har bir savolda 4 ta variant va 1 ta to‘g‘ri javob bo‘lishi kerak.`
    );
    return;
  }

  /*
    Server JSON bo'lmagan javob qaytarsa ham
    "Unexpected token R" chiqmasligi uchun.
  */
  async function readApiResponse(
    response: Response
  ) {
    const text =
      await response.text();

    let data: any = null;

    try {
      data = text
        ? JSON.parse(text)
        : {};
    } catch {
      throw new Error(
        text ||
          `Server xatosi: ${response.status}`
      );
    }

    if (
      !response.ok ||
      !data?.success
    ) {
      throw new Error(
        data?.message ||
          `Server xatosi: ${response.status}`
      );
    }

    return data;
  }

  try {
    setSaving(true);
    setMessage(
      "Testni saqlash boshlandi..."
    );

    /*
      Savollarni server schema'ga tayyorlaymiz.
    */
    const preparedQuestions =
      questions.map(
        (question) => ({
          id:
            question.id,

          questionHtml:
            sanitizeRichHtml(
              questionDrafts[
                question.id
              ] ??
                question.questionText
            ),

          options:
            question.options.map(
              (option) => ({
                id:
                  option.id,

                text:
                  sanitizeRichHtml(
                    option.text
                  ),

                isCorrect:
                  option.isCorrect,
              })
            ),

          shapes:
            Array.isArray(
              question.shapes
            )
              ? question.shapes.flatMap<EditorShape>(
                  (
                    shape
                  ): EditorShape[] => {
                    if (
                      shape.type !==
                      "matchingItem"
                    ) {
                      return [
                        {
                          id:
                            shape.id,

                          type:
                            shape.type,

                          x:
                            Math.round(
                              shape.x
                            ),

                          y:
                            Math.round(
                              shape.y
                            ),

                          width:
                            Math.max(
                              1,
                              Math.round(
                                shape.width
                              )
                            ),

                          height:
                            Math.max(
                              1,
                              Math.round(
                                shape.height
                              )
                            ),

                          text:
                            shape.text,

                          imageSrc:
                            shape.imageSrc,

                          backgroundColor:
                            shape.backgroundColor,

                          borderColor:
                            shape.borderColor,

                          textColor:
                            shape.textColor,

                          fontSize:
                            shape.fontSize,

                          borderWidth:
                            shape.borderWidth,

                          borderRadius:
                            shape.borderRadius,

                          opacity:
                            shape.opacity,

                          objectFit:
                            shape.objectFit,

                          zIndex:
                            shape.zIndex,
                        },
                      ];
                    }

                    const keyWidth =
                      50;

                    const gap =
                      8;

                    const boxX =
                      Math.round(
                        shape.x
                      ) +
                      keyWidth -
                      8;

                    const boxWidth =
                      Math.max(
                        70,
                        Math.round(
                          shape.width
                        ) -
                          keyWidth +
                          8
                      );

                    return [
                      {
                        id:
                          `${shape.id}-box`,

                        type:
                          "roundedRectangle",

                        x:
                          boxX,

                        y:
                          Math.round(
                            shape.y
                          ),

                        width:
                          boxWidth,

                        height:
                          Math.max(
                            1,
                            Math.round(
                              shape.height
                            )
                          ),

                        backgroundColor:
                          "#ffffff",

                        borderColor:
                          shape.borderColor ||
                          "#1f2a30",

                        borderWidth:
                          2,

                        borderRadius:
                          8,

                        zIndex:
                          shape.zIndex,
                      },

                      {
                        id:
                          `${shape.id}-key-circle`,

                        type:
                          "circle",

                        x:
                          Math.round(
                            shape.x
                          ),

                        y:
                          Math.round(
                            shape.y
                          ) +
                          Math.max(
                            0,
                            Math.round(
                              (
                                shape.height -
                                keyWidth
                              ) /
                                2
                            )
                          ),

                        width:
                          keyWidth,

                        height:
                          keyWidth,

                        backgroundColor:
                          "#ffffff",

                        borderColor:
                          shape.borderColor ||
                          "#1f2a30",

                        borderWidth:
                          2,

                        borderRadius:
                          999,

                        zIndex:
                          (shape.zIndex ||
                            1) +
                          1,
                      },

                      {
                        id:
                          `${shape.id}-key`,

                        type:
                          "text",

                        x:
                          Math.round(
                            shape.x
                          ),

                        y:
                          Math.round(
                            shape.y
                          ) +
                          Math.max(
                            0,
                            Math.round(
                              (
                                shape.height -
                                keyWidth
                              ) /
                                2
                            )
                          ),

                        width:
                          keyWidth,

                        height:
                          keyWidth,

                        text:
                          shape.matchingKey ||
                          "",

                        textColor:
                          shape.textColor ||
                          "#111111",

                        fontSize:
                          19,

                        borderWidth:
                          0,

                        zIndex:
                          (shape.zIndex ||
                            1) +
                          2,
                      },

                      {
                        id:
                          `${shape.id}-text`,

                        type:
                          "text",

                        x:
                          boxX +
                          gap,

                        y:
                          Math.round(
                            shape.y
                          ) +
                          7,

                        width:
                          Math.max(
                            40,
                            boxWidth -
                              gap *
                                2
                          ),

                        height:
                          Math.max(
                            30,
                            Math.round(
                              shape.height
                            ) -
                              14
                          ),

                        text:
                          shape.text ||
                          "",

                        textColor:
                          shape.textColor ||
                          "#111111",

                        fontSize:
                          shape.fontSize ||
                          18,

                        borderWidth:
                          0,

                        zIndex:
                          (shape.zIndex ||
                            1) +
                          2,
                      },
                    ];
                  }
                )
              : [],

          points: 1,
        })
      );

    /* =====================================================
       1-BOSQICH — BO'SH TEST YARATAMIZ
    ===================================================== */

    const createResponse =
      await fetch(
        "/api/tests",
        {
          method: "POST",

          credentials:
            "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              action:
                "create-chunked-test",

              title:
                title.trim(),

              subject:
                subject.trim(),

              duration:
                Number(
                  duration
                ) || 60,

              description:
                description.trim(),

              testType,

              customTestTypeName:
                testType ===
                "custom"
                  ? customTestTypeName.trim()
                  : "",

              status:
                "draft",

              attemptLimit:
                attemptLimitEnabled
                  ? Math.max(
                      1,
                      Number(
                        attemptLimit
                      ) || 1
                    )
                  : null,

              expectedQuestions:
                preparedQuestions.length,
            }),
        }
      );

    const createData =
      await readApiResponse(
        createResponse
      );

    const testId =
      String(
        createData.testId ||
          ""
      );

    if (!testId) {
      throw new Error(
        "Yangi test ID olinmadi."
      );
    }

    /* =====================================================
       2-BOSQICH — SAVOLLARNI 10 TADAN YUBORAMIZ
    ===================================================== */

    const CHUNK_SIZE =
      10;

    for (
      let startIndex = 0;
      startIndex <
      preparedQuestions.length;
      startIndex +=
        CHUNK_SIZE
    ) {
      const chunk =
        preparedQuestions.slice(
          startIndex,
          startIndex +
            CHUNK_SIZE
        );

      setMessage(
        `${startIndex}/${preparedQuestions.length} ta savol saqlandi...`
      );

      const chunkResponse =
        await fetch(
          "/api/tests",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "append-questions",

                testId,

                startIndex,

                questions:
                  chunk,
              }),
          }
        );

      const chunkData =
        await readApiResponse(
          chunkResponse
        );

      setMessage(
        `${chunkData.receivedQuestions}/${preparedQuestions.length} ta savol saqlandi...`
      );
    }

    /* =====================================================
       3-BOSQICH — TESTNI YAKUNLAYMIZ
    ===================================================== */

    const finalizeResponse =
      await fetch(
        "/api/tests",
        {
          method:
            "POST",

          credentials:
            "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              action:
                "finalize-chunked-test",

              testId,

              status:
                "draft",
            }),
        }
      );

    await readApiResponse(
      finalizeResponse
    );

    setMessage(
      `${preparedQuestions.length} ta savol muvaffaqiyatli saqlandi.`
    );

    window.alert(
      `Test muvaffaqiyatli saqlandi.\n\nJami: ${preparedQuestions.length} ta savol.`
    );

    router.push(
      "/admin/tests"
    );
  } catch (error) {
    console.error(
      "SAVE IMPORTED TEST ERROR:",
      error
    );

    setMessage(
      error instanceof Error
        ? error.message
        : "Testni saqlashda xatolik."
    );
  } finally {
    setSaving(false);
  }
}
