"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type UserRole = "admin" | "user" | null;

type CaseQuestion = {
  id: string;
  question: string;
  answer: string;
};

type PlatformCase = {
  id: string;
  type: "platform";
  subject: string;
  title: string;
  caseText: string;
  questions: CaseQuestion[];
  createdAt: string;
  updatedAt: string;
};

type PdfCase = {
  id: string;
  type: "pdf";
  subject: string;
  title: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  pathname: string;
  createdAt: string;
  updatedAt: string;
};

type AnyCase = PlatformCase | PdfCase;

type CourseNumber = 1 | 2 | 3 | 4;
type SemesterNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type SubjectFolder = {
  id: string;
  name: string;
  course: CourseNumber;
  semester: SemesterNumber;
  createdAt: string;
  updatedAt: string;
};

type Mode = "list" | "write" | "upload" | "view";


function stripHtml(value: string) {
  if (!value) return "";

  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}


type DiagramNode = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  parentId: string | null;
};

type DiagramBuilderProps = {
  onInsert: (html: string) => void;
  onClose: () => void;
};

function DiagramBuilder({
  onInsert,
  onClose,
}: DiagramBuilderProps) {
  const [nodes, setNodes] = useState<DiagramNode[]>([
    {
      id: "root",
      text: "Fuqarolik huquqiy\nmunosabat elementlari",
      x: 30,
      y: 150,
      width: 250,
      height: 100,
      color: "#ef1b13",
      parentId: null,
    },
    {
      id: "n1",
      text: "Sub’yektlar",
      x: 390,
      y: 30,
      width: 330,
      height: 86,
      color: "#b7b7b7",
      parentId: "root",
    },
    {
      id: "n2",
      text: "Ob’yektlar",
      x: 390,
      y: 140,
      width: 330,
      height: 86,
      color: "#5b9bd5",
      parentId: "root",
    },
    {
      id: "n3",
      text: "Mazmuni",
      x: 390,
      y: 250,
      width: 330,
      height: 86,
      color: "#ffc000",
      parentId: "root",
    },
  ]);

  const [selectedId, setSelectedId] =
    useState<string | null>("root");

  const [diagramCaption, setDiagramCaption] = useState("");

  const [dragState, setDragState] =
    useState<{
      id: string;
      startX: number;
      startY: number;
      nodeX: number;
      nodeY: number;
    } | null>(null);

  const [resizeState, setResizeState] =
    useState<{
      id: string;
      handle: string;
      startX: number;
      startY: number;
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (dragState) {
        const dx =
          event.clientX -
          dragState.startX;

        const dy =
          event.clientY -
          dragState.startY;

        setNodes((old) =>
          old.map((node) =>
            node.id === dragState.id
              ? {
                  ...node,
                  x: Math.max(
                    0,
                    dragState.nodeX + dx
                  ),
                  y: Math.max(
                    0,
                    dragState.nodeY + dy
                  ),
                }
              : node
          )
        );
      }

      if (resizeState) {
        const dx =
          event.clientX -
          resizeState.startX;

        const dy =
          event.clientY -
          resizeState.startY;

        let {
          x,
          y,
          width,
          height,
        } = resizeState;

        const minW = 90;
        const minH = 50;

        if (
          resizeState.handle.includes("e")
        ) {
          width =
            Math.max(
              minW,
              resizeState.width + dx
            );
        }

        if (
          resizeState.handle.includes("s")
        ) {
          height =
            Math.max(
              minH,
              resizeState.height + dy
            );
        }

        if (
          resizeState.handle.includes("w")
        ) {
          const nextWidth =
            resizeState.width - dx;

          if (nextWidth >= minW) {
            width = nextWidth;
            x =
              resizeState.x + dx;
          }
        }

        if (
          resizeState.handle.includes("n")
        ) {
          const nextHeight =
            resizeState.height - dy;

          if (nextHeight >= minH) {
            height = nextHeight;
            y =
              resizeState.y + dy;
          }
        }

        setNodes((old) =>
          old.map((node) =>
            node.id === resizeState.id
              ? {
                  ...node,
                  x,
                  y,
                  width,
                  height,
                }
              : node
          )
        );
      }
    }

    function onUp() {
      setDragState(null);
      setResizeState(null);
    }

    window.addEventListener(
      "mousemove",
      onMove
    );

    window.addEventListener(
      "mouseup",
      onUp
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        onMove
      );

      window.removeEventListener(
        "mouseup",
        onUp
      );
    };
  }, [dragState, resizeState]);

  const selected =
    nodes.find(
      (node) =>
        node.id === selectedId
    ) ?? null;

  function addNode(
    direction: "right" | "left" | "below" | "above" = "right"
  ) {
    const parentId =
      selectedId ??
      "root";

    const parent =
      nodes.find(
        (node) =>
          node.id === parentId
      ) ?? nodes[0];

    const siblings =
      nodes.filter(
        (node) =>
          node.parentId === parent.id
      );

    const id =
      `node-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

    let x =
      parent.x +
      parent.width +
      110;

    let y =
      parent.y +
      siblings.length * 96;

    if (direction === "left") {
      x =
        Math.max(
          10,
          parent.x - 240 - 110
        );
      y =
        parent.y +
        siblings.length * 24;
    }

    if (direction === "below") {
      x =
        parent.x +
        siblings.length * 28;
      y =
        parent.y +
        parent.height +
        55;
    }

    if (direction === "above") {
      x =
        parent.x +
        siblings.length * 28;
      y =
        Math.max(
          10,
          parent.y - 76 - 55
        );
    }

    setNodes((old) => [
      ...old,
      {
        id,
        text: "Yangi blok",
        x,
        y,
        width: 240,
        height: 76,
        color: "#d9eaf7",
        parentId:
          parent.id,
      },
    ]);

    setSelectedId(id);
  }

  function duplicateSelected() {
    if (!selected) return;

    const id =
      `node-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

    setNodes((old) => [
      ...old,
      {
        ...selected,
        id,
        x: selected.x + 35,
        y: selected.y + 35,
        text: `${selected.text}`,
      },
    ]);

    setSelectedId(id);
  }

  function removeSelected() {
    if (
      !selectedId ||
      selectedId === "root"
    ) {
      return;
    }

    setNodes((old) =>
      old
        .filter(
          (node) =>
            node.id !==
            selectedId
        )
        .map((node) =>
          node.parentId ===
          selectedId
            ? {
                ...node,
                parentId:
                  "root",
              }
            : node
        )
    );

    setSelectedId("root");
  }

  function updateSelected(
    patch: Partial<DiagramNode>
  ) {
    if (!selectedId) return;

    setNodes((old) =>
      old.map((node) =>
        node.id === selectedId
          ? {
              ...node,
              ...patch,
            }
          : node
      )
    );
  }

  function makeDiagramHtml() {
    const maxX =
      Math.max(
        ...nodes.map(
          (node) =>
            node.x +
            node.width
        ),
        900
      ) + 40;

    const maxY =
      Math.max(
        ...nodes.map(
          (node) =>
            node.y +
            node.height
        ),
        420
      ) + 40;

    const lineSvg =
      nodes
        .filter(
          (node) =>
            node.parentId
        )
        .map((node) => {
          const parent =
            nodes.find(
              (item) =>
                item.id ===
                node.parentId
            );

          if (!parent) {
            return "";
          }

          const x1 =
            parent.x +
            parent.width;

          const y1 =
            parent.y +
            parent.height / 2;

          const x2 =
            node.x;

          const y2 =
            node.y +
            node.height / 2;

          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#5b9bd5" stroke-width="3"/>`;
        })
        .join("");

    const boxes =
      nodes
        .map((node) => {
          const safeText =
            node.text
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");

          return `
            <div style="
              position:absolute;
              left:${node.x}px;
              top:${node.y}px;
              width:${node.width}px;
              height:${node.height}px;
              display:flex;
              align-items:center;
              justify-content:center;
              padding:10px;
              box-sizing:border-box;
              border:3px solid rgba(80,80,80,.75);
              border-radius:14px;
              background:${node.color};
              color:#111;
              font-weight:700;
              text-align:center;
              white-space:pre-wrap;
              box-shadow:
                inset 5px 0 4px rgba(255,255,255,.75),
                inset -5px 0 4px rgba(0,0,0,.13),
                0 5px 0 rgba(70,70,70,.7),
                0 8px 12px rgba(0,0,0,.20);
            ">
              ${safeText}
            </div>
          `;
        })
        .join("");

    return `
      <div data-editor-object="diagram" style="
        position:relative;
        width:100%;
        resize:both;
        overflow:auto;
        min-width:420px;
        min-height:260px;
        min-width:${Math.min(maxX, 1200)}px;
        height:${maxY}px;
        margin:18px 0;
        overflow:auto;
        background:#fff;
      ">
        <svg
          viewBox="0 0 ${maxX} ${maxY}"
          style="position:absolute;inset:0;width:${maxX}px;height:${maxY}px;overflow:visible;"
        >
          ${lineSvg}
        </svg>

        ${boxes}
      </div>
      ${
        diagramCaption.trim()
          ? `<p style="margin:14px 0 0;text-align:justify;text-indent:2em;font-size:18px;line-height:1.6;">${diagramCaption
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}</p>`
          : ""
      }
      <p><br></p>
    `;
  }

  const handles = [
    ["nw", "0%", "0%"],
    ["n", "50%", "0%"],
    ["ne", "100%", "0%"],
    ["e", "100%", "50%"],
    ["se", "100%", "100%"],
    ["s", "50%", "100%"],
    ["sw", "0%", "100%"],
    ["w", "0%", "50%"],
  ];

  return (
    <div className="diagramModal">
      <div className="diagramWindow">
        <div className="diagramHeader">
          <div>
            <strong>
              Diagramma / shakl muharriri
            </strong>
            <div className="diagramSub">
              Tugunni sudrang. 8 ta nuqtadan tortib razmerini o‘zgartiring.
            </div>
          </div>

          <button
            type="button"
            className="diagramClose"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="diagramToolbar">
          <button
            type="button"
            onClick={() => addNode("right")}
          >
            + O‘ngga
          </button>

          <button
            type="button"
            onClick={() => addNode("left")}
          >
            + Chapga
          </button>

          <button
            type="button"
            onClick={() => addNode("below")}
          >
            + Pastiga
          </button>

          <button
            type="button"
            onClick={() => addNode("above")}
          >
            + Tepaga
          </button>

          <button
            type="button"
            onClick={duplicateSelected}
            disabled={!selected}
          >
            Nusxalash
          </button>

          <button
            type="button"
            className="danger"
            onClick={removeSelected}
            disabled={
              !selectedId ||
              selectedId === "root"
            }
          >
            O‘chirish
          </button>

          <button
            type="button"
            className="insertDiagram"
            onClick={() => {
              onInsert(
                makeDiagramHtml()
              );
              onClose();
            }}
          >
            Diagrammani qo‘shish
          </button>
        </div>

        <div className="diagramBody">
          <div className="diagramInspector">
            <h4>
              Tanlangan shakl
            </h4>

            {selected ? (
              <>
                <label>
                  Matn
                  <textarea
                    value={
                      selected.text
                    }
                    onChange={(e) =>
                      updateSelected({
                        text:
                          e.target
                            .value,
                      })
                    }
                  />
                </label>

                <label>
                  Rang
                  <input
                    type="color"
                    value={
                      selected.color
                    }
                    onChange={(e) =>
                      updateSelected({
                        color:
                          e.target
                            .value,
                      })
                    }
                  />
                </label>

                <div className="sizeGrid">
                  <label>
                    Kenglik
                    <input
                      type="number"
                      min={90}
                      value={
                        Math.round(
                          selected.width
                        )
                      }
                      onChange={(e) =>
                        updateSelected({
                          width:
                            Math.max(
                              90,
                              Number(
                                e.target
                                  .value
                              ) ||
                                90
                            ),
                        })
                      }
                    />
                  </label>

                  <label>
                    Balandlik
                    <input
                      type="number"
                      min={50}
                      value={
                        Math.round(
                          selected.height
                        )
                      }
                      onChange={(e) =>
                        updateSelected({
                          height:
                            Math.max(
                              50,
                              Number(
                                e.target
                                  .value
                              ) ||
                                50
                            ),
                        })
                      }
                    />
                  </label>
                </div>

                <label className="captionLabel">
                  Diagramma tagidagi matn
                  <textarea
                    value={diagramCaption}
                    onChange={(e) =>
                      setDiagramCaption(e.target.value)
                    }
                    placeholder="Diagrammadan keyin chiqadigan izoh yoki davomiy matn..."
                  />
                </label>
              </>
            ) : (
              <p>
                Shaklni tanlang.
              </p>
            )}
          </div>

          <div className="diagramCanvasWrap">
            <div
              className="diagramCanvas"
              style={{
                width: 960,
                height: 520,
              }}
            >
              <svg className="diagramLines">
                {nodes
                  .filter(
                    (node) =>
                      node.parentId
                  )
                  .map((node) => {
                    const parent =
                      nodes.find(
                        (item) =>
                          item.id ===
                          node.parentId
                      );

                    if (!parent) {
                      return null;
                    }

                    return (
                      <line
                        key={`line-${node.id}`}
                        x1={
                          parent.x +
                          parent.width
                        }
                        y1={
                          parent.y +
                          parent.height /
                            2
                        }
                        x2={node.x}
                        y2={
                          node.y +
                          node.height /
                            2
                        }
                        stroke="#5b9bd5"
                        strokeWidth="3"
                      />
                    );
                  })}
              </svg>

              {nodes.map(
                (node) => {
                  const active =
                    node.id ===
                    selectedId;

                  return (
                    <div
                      key={
                        node.id
                      }
                      className={
                        active
                          ? "diagramNode active"
                          : "diagramNode"
                      }
                      style={{
                        left:
                          node.x,
                        top:
                          node.y,
                        width:
                          node.width,
                        height:
                          node.height,
                        background:
                          node.color,
                      }}
                      onMouseDown={(
                        event
                      ) => {
                        if (
                          (
                            event
                              .target as HTMLElement
                          ).classList.contains(
                            "resizeHandle"
                          )
                        ) {
                          return;
                        }

                        setSelectedId(
                          node.id
                        );

                        setDragState({
                          id:
                            node.id,
                          startX:
                            event.clientX,
                          startY:
                            event.clientY,
                          nodeX:
                            node.x,
                          nodeY:
                            node.y,
                        });
                      }}
                    >
                      <div className="diagramNodeText">
                        {node.text}
                      </div>

                      {active &&
                        handles.map(
                          ([
                            handle,
                            left,
                            top,
                          ]) => (
                            <span
                              key={
                                handle
                              }
                              className={`resizeHandle h-${handle}`}
                              style={{
                                left,
                                top,
                              }}
                              onMouseDown={(
                                event
                              ) => {
                                event.stopPropagation();

                                setResizeState({
                                  id:
                                    node.id,
                                  handle,
                                  startX:
                                    event.clientX,
                                  startY:
                                    event.clientY,
                                  x:
                                    node.x,
                                  y:
                                    node.y,
                                  width:
                                    node.width,
                                  height:
                                    node.height,
                                });
                              }}
                            />
                          )
                        )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .diagramModal {
          position: fixed;
          z-index: 12000;
          inset: 0;
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,.55);
        }

        .diagramWindow {
          width: min(1250px, 98vw);
          max-height: 94vh;
          overflow: auto;
          border: 3px solid #173e58;
          border-radius: 18px;
          background: #e9e9e9;
          box-shadow: 0 18px 50px rgba(0,0,0,.45);
        }

        .diagramHeader {
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: linear-gradient(#9bd9ff,#4e9ccc);
          color: #073b68;
          font-size: 20px;
        }

        .diagramSub {
          margin-top: 4px;
          font-size: 13px;
          font-weight: 700;
        }

        .diagramClose {
          width: 42px;
          height: 42px;
          border: 2px solid #555;
          border-radius: 9px;
          cursor: pointer;
          font-size: 18px;
          font-weight: 700;
          background: #fff;
        }

        .diagramToolbar {
          padding: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          border-bottom: 2px solid #777;
          background: #d7d7d7;
        }

        .diagramToolbar button {
          min-height: 42px;
          padding: 8px 14px;
          border: 2px solid #555;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
          background: linear-gradient(#fff,#c9c9c9);
        }

        .diagramToolbar .danger {
          color: #7f1616;
        }

        .diagramToolbar .insertDiagram {
          margin-left: auto;
          border-color: #174461;
          color: #073b68;
          background: linear-gradient(#a8e1ff,#54a8db);
        }

        .diagramBody {
          display: grid;
          grid-template-columns: 230px 1fr;
          min-height: 560px;
        }

        .diagramInspector {
          padding: 16px;
          border-right: 2px solid #777;
          background: #efefef;
        }

        .diagramInspector h4 {
          margin: 0 0 14px;
          color: #073b68;
        }

        .diagramInspector label {
          display: block;
          margin-bottom: 12px;
          color: #173e58;
          font-size: 14px;
        }

        .diagramInspector textarea,
        .diagramInspector input {
          width: 100%;
          margin-top: 5px;
          padding: 8px;
          border: 2px solid #666;
          border-radius: 7px;
          font-family: inherit;
        }

        .diagramInspector textarea {
          min-height: 90px;
          resize: vertical;
        }

        .sizeGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .captionLabel {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #aaa;
        }

        .captionLabel textarea {
          min-height: 110px;
        }

        .diagramCanvasWrap {
          overflow: auto;
          padding: 20px;
          background:
            linear-gradient(#f7f7f7 1px,transparent 1px),
            linear-gradient(90deg,#f7f7f7 1px,transparent 1px),
            #fff;
          background-size: 20px 20px;
        }

        .diagramCanvas {
          position: relative;
          margin: 0 auto;
          border: 1px dashed #b7b7b7;
        }

        .diagramLines {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: visible;
        }

        .diagramNode {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          box-sizing: border-box;
          border: 3px solid rgba(80,80,80,.75);
          border-radius: 14px;
          cursor: move;
          user-select: none;
          box-shadow:
            inset 5px 0 4px rgba(255,255,255,.75),
            inset -5px 0 4px rgba(0,0,0,.13),
            0 5px 0 rgba(70,70,70,.7),
            0 8px 12px rgba(0,0,0,.20);
        }

        .diagramNode.active {
          outline: 2px solid #1e88e5;
          outline-offset: 3px;
        }

        .diagramNodeText {
          width: 100%;
          white-space: pre-wrap;
          text-align: center;
          color: #111;
          font-size: 18px;
          font-weight: 700;
          pointer-events: none;
        }

        .resizeHandle {
          position: absolute;
          width: 12px;
          height: 12px;
          border: 2px solid #1976d2;
          border-radius: 50%;
          background: #fff;
          transform: translate(-50%,-50%);
          z-index: 5;
        }

        .h-nw,
        .h-se {
          cursor: nwse-resize;
        }

        .h-ne,
        .h-sw {
          cursor: nesw-resize;
        }

        .h-n,
        .h-s {
          cursor: ns-resize;
        }

        .h-e,
        .h-w {
          cursor: ew-resize;
        }

        @media (max-width: 850px) {
          .diagramBody {
            grid-template-columns: 1fr;
          }

          .diagramInspector {
            border-right: 0;
            border-bottom: 2px solid #777;
          }
        }

        /* =========================================
           TELEFON — HUJJAT/PDFGA O‘XSHASH O‘QISH
        ========================================= */
        @media (max-width: 760px) {
          .page {
            width: 100%;
            min-width: 0;
            overflow-x: hidden;
          }

          .topPanel {
            width: calc(100% - 12px);
            margin: 6px auto 0;
            padding: 9px;
            border-width: 2px;
            border-radius: 15px;
          }

          .titlePlate {
            min-width: 0;
            width: 100%;
            padding: 10px 8px;
            border-width: 2px;
            border-radius: 11px;
            font-size: 20px;
          }

          .backButton {
            width: 100%;
            height: 46px;
            border-width: 2px;
            border-radius: 10px;
          }

          .controlBox {
            width: calc(100% - 16px);
            margin: 24px auto 0;
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .mainActionButton {
            min-height: 50px;
            padding: 8px 10px;
            border-width: 2px;
            border-radius: 11px;
            font-size: 15px;
            box-shadow:
              inset 0 4px 4px rgba(255,255,255,.78),
              0 4px 0 #17415c;
          }

          .mainBox,
          .editorBox,
          .viewerBox {
            width: calc(100% - 8px);
            margin: 42px auto 14px;
            padding: 42px 4px 14px;
            border-width: 2px;
            border-radius: 13px;
          }

          .readingViewerBox {
            width: 100%;
            margin-top: 8px;
            padding: 12px 2px 14px;
            border-radius: 12px;
          }

          .readingSectionTitle {
            width: min(190px, 72%);
            min-width: 0;
            margin: 0 auto 12px;
            padding: 7px 12px;
            border-width: 2px;
            border-radius: 9px;
            font-size: 17px;
            box-shadow:
              inset 0 3px 3px rgba(255,255,255,.85),
              0 3px 0 #17415c;
          }

          .viewerHeader {
            width: calc(100% - 8px);
            margin: 0 auto 10px;
            padding: 11px;
            display: block;
            border-width: 2px;
            border-radius: 11px;
          }

          .viewerSubject {
            padding: 5px 10px;
            font-size: 13px;
          }

          .viewerHeader h1 {
            margin-top: 8px;
            font-size: 22px;
            line-height: 1.2;
          }

          .viewerHeaderActions {
            width: 100%;
            margin-top: 10px;
            display: flex;
            flex-direction: row;
            gap: 7px;
          }

          .viewerHeaderActions button {
            width: 100%;
            min-width: 0;
            min-height: 42px;
            padding: 7px 9px;
            border-width: 2px;
            border-radius: 9px;
            font-size: 13px;
          }

          .readerToolbar {
            position: sticky;
            top: 4px;
            width: calc(100% - 8px);
            max-width: none;
            margin: 0 auto 10px;
            padding: 6px;
            display: flex;
            flex-wrap: nowrap;
            align-items: center;
            gap: 5px;
            overflow-x: auto;
            overflow-y: hidden;
            border-width: 2px;
            border-radius: 10px;
            scrollbar-width: thin;
          }

          .readerToolGroup {
            width: auto;
            flex: 0 0 auto;
            display: flex;
            flex-wrap: nowrap;
            gap: 5px;
          }

          .readerToolButton,
          .readerModeButton {
            min-width: 38px;
            min-height: 36px;
            padding: 5px 8px;
            border-width: 2px;
            border-radius: 7px;
            font-size: 13px;
            white-space: nowrap;
            box-shadow: 0 2px 0 #575e62;
          }

          .readerToolButton {
            font-size: 18px;
          }

          .readerZoomValue {
            min-width: 52px;
            font-size: 14px;
          }

          .readerColorControl {
            min-height: 36px;
            padding: 4px 7px;
            border-width: 2px;
            border-radius: 7px;
            font-size: 13px;
            white-space: nowrap;
          }

          .readerColorControl input {
            width: 27px;
            height: 24px;
          }

          .readerModeStatus {
            display: none;
          }

          .readerViewport {
            width: 100%;
            max-width: none;
            min-height: 480px;
            margin: 0;
            padding: 7px 3px 24px;
            overflow-x: hidden;
            border-width: 2px;
            border-radius: 9px;
            background: transparent;
          }

          .readerPaper {
            width: calc(100% - 6px) !important;
            max-width: none;
            margin: 0 auto;
            padding: 12px 9px 18px;
            border-radius: 1px;
            transform-origin: top center;
            box-shadow: 0 3px 12px rgba(0,0,0,.28);
          }

          .readerCaseTextBox {
            width: 100%;
            padding: 4px 2px 10px;
          }

          .caseTextBox h2 {
            margin: 0 0 10px;
            font-size: 19px;
          }

          /*
            PDF/Word’dan kirgan inline justify/spacing mobil ekranda
            so‘zlarni uzoqlashtirmasin. Bold/italic/underline/rang saqlanadi.
          */
          .readerPaper .richViewerContent,
          .readerPaper .richViewerContent p,
          .readerPaper .richViewerContent div,
          .readerPaper .richViewerContent span,
          .readerPaper .richViewerContent li,
          .readerPaper .richViewerContent blockquote {
            text-align: left !important;
            text-align-last: auto !important;
            letter-spacing: normal !important;
            word-spacing: normal !important;
            white-space: normal !important;
          }

          .readerPaper .richViewerContent {
            font-size: 15.5px;
            line-height: 1.48;
            overflow-wrap: anywhere;
            word-break: normal;
          }

          .readerPaper .richViewerContent p,
          .readerPaper .richViewerContent div {
            margin-top: 0;
            margin-bottom: 7px;
          }

          .viewerQuestionsTitle {
            margin: 14px 0 10px;
            padding: 8px;
            font-size: 17px;
            border-radius: 8px;
          }

          .viewerQuestions {
            gap: 12px;
          }

          .viewerQuestionCard {
            padding: 5px;
            border-radius: 10px;
          }

          .viewerQuestion {
            padding: 0;
          }

          .viewerQuestion3D {
            padding: 8px 8px;
            border-width: 1.5px;
            border-radius: 9px;
            box-shadow:
              inset 0 3px 3px rgba(255,255,255,.9),
              0 3px 0 #666d71;
          }

          .questionNumberInline3D {
            min-width: 62px;
            padding: 4px 6px;
            margin: 0 6px 1px 0;
            border-width: 1.5px;
            border-radius: 6px;
            font-size: 11px;
            box-shadow:
              inset 0 2px 2px rgba(255,255,255,.9),
              0 2px 0 #17415c;
          }

          .questionFlow,
          .inlineQuestionContent,
          .inlineQuestionContent p,
          .inlineQuestionContent div,
          .inlineQuestionContent span {
            font-size: 15px !important;
            line-height: 1.42 !important;
            text-align: left !important;
            text-align-last: auto !important;
            letter-spacing: normal !important;
            word-spacing: normal !important;
          }

          .viewerAnswer {
            margin-top: 9px;
            padding: 10px 8px;
            border-radius: 9px;
          }

          .answerLabel {
            margin-bottom: 7px;
            font-size: 16px;
          }

          .caseCardActions {
            flex-direction: column;
          }

          .caseCardActions button {
            width: 100%;
            min-width: 0;
          }

          /* Editor telefonning o‘zida ham ekrandan chiqmasin */
          .formGroup,
          .questionsBox,
          .richEditorShell {
            width: 100%;
            max-width: 100%;
          }

          .richToolbar {
            width: 100%;
            overflow-x: auto;
          }

          .toolGroup {
            min-width: 600px;
          }
        }

        @media (max-width: 420px) {
          .readerPaper .richViewerContent {
            font-size: 14.5px;
            line-height: 1.45;
          }

          .questionFlow,
          .inlineQuestionContent,
          .inlineQuestionContent p,
          .inlineQuestionContent div,
          .inlineQuestionContent span {
            font-size: 14.5px !important;
          }

          .viewerHeader h1 {
            font-size: 20px;
          }
        }


        /* =====================================================
           MOBILE LIST — universitet mobil sahifasiga yaqin tartib
        ===================================================== */
        @media (max-width: 760px) {
          .mainBox {
            background: #eeeeee;
            border: 0;
            box-shadow: none;
            padding: 50px 12px 22px;
          }

          .mainBox .sectionTitle {
            border-width: 1.5px;
            border-radius: 10px;
            box-shadow:
              inset 0 3px 3px rgba(255,255,255,.8),
              0 3px 0 #17415c;
          }

          .searchRow {
            display: grid;
            grid-template-columns: 1fr;
            gap: 9px;
            margin-bottom: 16px;
          }

          .searchInput {
            width: 100%;
            min-width: 0;
            height: 46px;
            font-size: 14px;
            border-radius: 11px;
          }

          .refreshButton {
            width: 100%;
            height: 44px;
            border-radius: 10px;
          }

          .casesGrid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .caseCard {
            min-height: 210px;
            padding: 16px 10px 14px;
            gap: 14px;
            border: 0;
            border-radius: 14px;
            background: #fff;
            box-shadow:
              0 2px 7px rgba(0,0,0,.10);
          }

          .caseCard h2 {
            margin: 0;
            font-size: 17px;
            line-height: 1.25;
            text-align: center;
          }

          .subjectBadge {
            max-width: 100%;
            padding: 5px 9px;
            border-width: 1.5px;
            border-radius: 999px;
            font-size: 11px;
            white-space: normal;
            text-align: center;
            line-height: 1.15;
            box-shadow:
              inset 0 2px 2px rgba(255,255,255,.85),
              0 2px 0 #17415c;
          }

          .caseAdminActions {
            gap: 6px;
          }

          .cardEditButton,
          .cardDeleteButton {
            flex: 1 1 0;
            min-width: 0;
            height: 30px;
            padding: 0 6px;
            font-size: 10.5px;
            border-radius: 7px;
          }

          .caseCardActions .openButton {
            width: 100%;
            max-width: none;
            height: 38px;
            font-size: 13px;
            border-width: 2px;
            border-radius: 9px;
          }
        }

        @media (max-width: 390px) {
          .casesGrid {
            grid-template-columns: 1fr;
          }

          .caseCard {
            min-height: 190px;
          }
        }

        /* =====================================================
           MOBILE READER — elektron kutubxona/PDF ko‘rinishi
        ===================================================== */
        @media (max-width: 760px) {
          .readingViewerBox {
            width: 100%;
            margin: 0;
            padding: 8px 0 12px;
            border: 0;
            border-radius: 0;
            background: transparent !important;
            box-shadow: none;
            overflow-x: hidden;
          }

          .readingSectionTitle {
            width: min(190px, 70%);
            margin: 6px auto 10px;
          }

          .viewerHeader {
            width: calc(100% - 16px);
            margin: 0 auto 8px;
            padding: 10px 12px;
            border-radius: 11px;
          }

          .readerToolbar {
            position: sticky;
            top: 0;
            z-index: 100;
            width: 100%;
            margin: 0;
            padding: 6px 8px;
            border-radius: 0;
            border-left: 0;
            border-right: 0;
            background: linear-gradient(#fafafa,#d6d6d6);
          }

          .readerViewport {
            width: 100%;
            margin: 0;
            padding: 7px 4px 20px;
            border: 0;
            border-radius: 0;
            background: transparent;
          }

          .readerPaper {
            width: calc(100% - 10px) !important;
            max-width: 640px;
            margin: 0 auto;
            padding: 18px 14px 24px;
            background: #fff;
            box-shadow: 0 0 0 1px rgba(0,0,0,.18);
          }

          .readerCaseTextBox {
            padding: 0;
            border: 0;
            background: #fff;
          }

          .readerPaper .richViewerContent,
          .readerPaper .richViewerContent p,
          .readerPaper .richViewerContent div,
          .readerPaper .richViewerContent li,
          .readerPaper .richViewerContent blockquote {
            text-align: justify !important;
            text-align-last: auto !important;
            text-justify: inter-word;
            letter-spacing: normal !important;
            word-spacing: normal !important;
          }

          .readerPaper .richViewerContent {
            font-size: 15px;
            line-height: 1.42;
            color: #111;
          }

          .readerPaper .richViewerContent p,
          .readerPaper .richViewerContent div {
            margin: 0 0 7px;
          }

          .viewerQuestion3D {
            background: #f2f2f2;
          }

          .questionFlow,
          .inlineQuestionContent,
          .inlineQuestionContent p,
          .inlineQuestionContent div,
          .inlineQuestionContent span {
            text-align: left !important;
            word-spacing: normal !important;
            letter-spacing: normal !important;
          }

          .viewerAnswer {
            background: #eef7ff;
          }
        }


        /* =====================================================
           FINAL MOBIL READER — PDF / A4 HUJJATGA O‘XSHASH
           Qora tashqi fon yo‘q. Oq sahifa + kichik zich matn.
        ===================================================== */
        @media (max-width: 600px) {
          html,
          body {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          .readingViewerBox {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 6px 0 12px !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
            overflow-x: hidden !important;
          }

          .readerViewport {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 4px 3px 16px !important;
            overflow-x: hidden !important;
            overflow-y: visible !important;
            background: transparent !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .readerPaper {
            width: calc(100vw - 10px) !important;
            max-width: calc(100vw - 10px) !important;
            min-width: 0 !important;
            margin: 0 auto 8px !important;
            padding: 14px 16px 18px !important;
            box-sizing: border-box !important;
            background: #fff !important;
            border: 1px solid #333 !important;
            border-radius: 0 !important;
            box-shadow: 0 1px 4px rgba(0,0,0,.14) !important;
            transform: none !important;
            transform-origin: top center !important;
            overflow: hidden !important;
          }

          .readerCaseTextBox {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10px 12px !important;
            box-sizing: border-box !important;
            background: #f8f8f8 !important;
            border: 1px solid #555 !important;
            border-radius: 5px !important;
            box-shadow: none !important;
          }

          .readerCaseTextBox h2,
          .caseTextBox h2 {
            margin: 0 0 8px !important;
            padding: 0 !important;
            font-size: 12.5px !important;
            line-height: 1.15 !important;
            color: #073f70 !important;
            text-align: left !important;
          }

          /* Asosiy matn: PDF'dagidek kichik va zich */
          .readerPaper .richViewerContent,
          .readerPaper .richViewerContent p,
          .readerPaper .richViewerContent div,
          .readerPaper .richViewerContent li,
          .readerPaper .richViewerContent blockquote {
            font-family: "Bell MT", "Times New Roman", serif !important;
            font-size: 10.5px !important;
            line-height: 1.26 !important;
            letter-spacing: 0 !important;
            word-spacing: normal !important;
            word-break: normal !important;
            overflow-wrap: normal !important;
            white-space: normal !important;
            hyphens: none !important;
            font-kerning: normal !important;
            text-rendering: optimizeLegibility !important;
          }

          .readerPaper .richViewerContent p,
          .readerPaper .richViewerContent div {
            margin: 0 0 5px !important;
            padding: 0 !important;
            text-align: justify !important;
            text-align-last: auto !important;
            text-justify: inter-word !important;
          }

          /* Inline span formatlar rang/bold/underline bilan saqlansin,
             lekin so'z oralig'ini buzmasin */
          .readerPaper .richViewerContent span {
            letter-spacing: 0 !important;
            word-spacing: normal !important;
          }

          /* Savol va javob bo'limlari */
          .viewerQuestionsTitle {
            margin: 10px 0 7px !important;
            padding: 6px 8px !important;
            font-size: 12px !important;
            line-height: 1.15 !important;
            border-radius: 5px !important;
          }

          .viewerQuestions {
            gap: 8px !important;
          }

          .viewerQuestionCard {
            padding: 4px !important;
            border-radius: 6px !important;
          }

          .viewerQuestion {
            padding: 0 !important;
          }

          .viewerQuestion3D {
            padding: 7px 8px !important;
            border: 1px solid #555 !important;
            border-radius: 5px !important;
            background: #f4f4f4 !important;
            box-shadow: 0 2px 0 #666 !important;
          }

          .questionNumberInline3D {
            min-width: 54px !important;
            padding: 4px 6px !important;
            margin: 0 5px 2px 0 !important;
            border-width: 1px !important;
            border-radius: 5px !important;
            font-size: 8.5px !important;
            line-height: 1 !important;
            box-shadow:
              inset 0 1px 1px rgba(255,255,255,.85),
              0 2px 0 #17415c !important;
          }

          .questionFlow,
          .inlineQuestionContent,
          .inlineQuestionContent p,
          .inlineQuestionContent div,
          .inlineQuestionContent span {
            font-family: "Bell MT", "Times New Roman", serif !important;
            font-size: 10.5px !important;
            line-height: 1.24 !important;
            text-align: left !important;
            text-align-last: auto !important;
            letter-spacing: 0 !important;
            word-spacing: normal !important;
          }

          .viewerAnswer {
            margin-top: 7px !important;
            padding: 9px 10px !important;
            border-radius: 5px !important;
            background: #e9f5ff !important;
          }

          .answerLabel {
            margin-bottom: 5px !important;
            font-size: 11px !important;
            line-height: 1.1 !important;
          }

          /* Toolbar kichik, bir qatorlik */
          .readerToolbar {
            position: sticky !important;
            top: 0 !important;
            z-index: 100 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 0 5px !important;
            padding: 4px 5px !important;
            display: flex !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            gap: 4px !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            border: 1px solid #777 !important;
            border-left: 0 !important;
            border-right: 0 !important;
            border-radius: 0 !important;
            background: linear-gradient(#fafafa,#dedede) !important;
            box-shadow: none !important;
            scrollbar-width: none !important;
          }

          .readerToolbar::-webkit-scrollbar {
            display: none !important;
          }

          .readerToolGroup {
            flex: 0 0 auto !important;
            width: auto !important;
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 4px !important;
          }

          .readerToolButton,
          .readerModeButton {
            min-width: 29px !important;
            min-height: 27px !important;
            padding: 2px 5px !important;
            border-width: 1px !important;
            border-radius: 5px !important;
            font-size: 9px !important;
            white-space: nowrap !important;
            box-shadow: 0 1px 0 #666 !important;
          }

          .readerToolButton {
            font-size: 14px !important;
          }

          .readerZoomValue {
            min-width: 40px !important;
            font-size: 10px !important;
          }

          .readerColorControl {
            min-height: 27px !important;
            padding: 2px 5px !important;
            gap: 3px !important;
            border-width: 1px !important;
            border-radius: 5px !important;
            font-size: 9px !important;
          }

          .readerColorControl input {
            width: 19px !important;
            height: 18px !important;
          }

          .readerModeStatus {
            display: none !important;
          }

          /* Reader tepasidagi fan/kazus bloki ham ixcham */
          .readingSectionTitle {
            width: min(170px, 65%) !important;
            min-width: 0 !important;
            margin: 4px auto 7px !important;
            padding: 5px 8px !important;
            border-width: 1px !important;
            border-radius: 7px !important;
            font-size: 13px !important;
            box-shadow:
              inset 0 2px 2px rgba(255,255,255,.85),
              0 2px 0 #17415c !important;
          }

          .viewerHeader {
            width: calc(100% - 8px) !important;
            margin: 0 auto 6px !important;
            padding: 7px 8px !important;
            border-width: 1px !important;
            border-radius: 7px !important;
          }

          .viewerSubject {
            padding: 3px 6px !important;
            font-size: 9px !important;
          }

          .viewerHeader h1 {
            margin: 4px 0 0 !important;
            font-size: 15px !important;
            line-height: 1.1 !important;
          }

          .viewerHeaderActions {
            margin-top: 6px !important;
            gap: 5px !important;
          }

          .viewerHeaderActions button {
            min-height: 28px !important;
            padding: 3px 6px !important;
            border-width: 1px !important;
            border-radius: 5px !important;
            font-size: 9px !important;
          }

          /* Jadval, rasm, diagramma sahifadan chiqib ketmasin */
          .readerPaper table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 8px !important;
          }

          .readerPaper td,
          .readerPaper th {
            padding: 2px 3px !important;
            font-size: 8px !important;
            line-height: 1.15 !important;
            overflow-wrap: break-word !important;
          }

          .readerPaper img,
          .readerPaper svg {
            display: block !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 5px auto !important;
          }
        }


      `}</style>
    </div>
  );
}

type RichEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  label?: string;
  paragraphMode?: "normal" | "question";
};

function RichEditor({
  value,
  onChange,
  placeholder = "Matn yozing...",
  minHeight = 260,
  label = "Matn muharriri",
  paragraphMode = "normal",
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastSelectedObjectRef =
    useRef<HTMLElement | null>(null);
  const lastSelectedCellRef =
    useRef<HTMLTableCellElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showShapes, setShowShapes] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showDiagramBuilder, setShowDiagramBuilder] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (editor.innerHTML !== value) {
      editor.innerHTML = value;
    }
  }, [value]);

  function syncValue() {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(editor.innerHTML);
  }

  function runCommand(command: string, commandValue?: string) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, commandValue);
    syncValue();
  }

  function applyBlockStyle(
    property: "lineHeight" | "marginTop" | "marginBottom",
    value: string
  ) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node: Node | null = selection.anchorNode;

    if (node?.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    if (!(node instanceof HTMLElement)) return;

    const block =
      node.closest<HTMLElement>("p,div,li,blockquote") ||
      editor;

    if (!editor.contains(block) && block !== editor) return;

    block.style[property] = value;
    syncValue();
  }

  function getCurrentBlock(): HTMLElement | null {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (
      !editor ||
      !selection ||
      selection.rangeCount === 0
    ) {
      return null;
    }

    let node: Node | null = selection.anchorNode;

    if (node?.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    if (!(node instanceof HTMLElement)) {
      return null;
    }

    let block =
      node.closest<HTMLElement>(
        "p, div, li, blockquote"
      );

    if (
      !block ||
      !editor.contains(block) ||
      block === editor
    ) {
      document.execCommand(
        "formatBlock",
        false,
        "p"
      );

      const nextSelection =
        window.getSelection();

      let nextNode =
        nextSelection?.anchorNode ??
        null;

      if (
        nextNode?.nodeType ===
        Node.TEXT_NODE
      ) {
        nextNode =
          nextNode.parentNode;
      }

      if (
        nextNode instanceof
        HTMLElement
      ) {
        block =
          nextNode.closest<HTMLElement>(
            "p, div, li, blockquote"
          );
      }
    }

    return block &&
      editor.contains(block)
      ? block
      : null;
  }

  function changeFirstLineIndent(
    direction: "increase" | "decrease"
  ) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const block =
      getCurrentBlock();

    if (!block) return;

    const current =
      parseFloat(
        block.style.textIndent ||
          "0"
      ) || 0;

    const next =
      direction === "increase"
        ? Math.min(
            current + 2,
            8
          )
        : Math.max(
            current - 2,
            0
          );

    block.style.textIndent =
      `${next}em`;

    syncValue();
  }

  function cleanPastedHtml(
    rawHtml: string
  ) {
    const parser =
      new DOMParser();

    const doc =
      parser.parseFromString(
        rawHtml,
        "text/html"
      );

    const allowed = new Set([
      "P",
      "DIV",
      "BR",
      "B",
      "STRONG",
      "I",
      "EM",
      "U",
      "S",
      "STRIKE",
      "SPAN",
      "UL",
      "OL",
      "LI",
      "BLOCKQUOTE",
      "SUB",
      "SUP",
      "FONT",
    ]);

    const all =
      Array.from(
        doc.body.querySelectorAll("*")
      );

    for (const el of all) {
      if (!allowed.has(el.tagName)) {
        el.replaceWith(
          ...Array.from(
            el.childNodes
          )
        );
        continue;
      }

      const element =
        el as HTMLElement;

      const computedStyle =
        element.getAttribute("style") || "";

      const color =
        element.style.color ||
        element.getAttribute("color") ||
        "";

      const backgroundColor =
        element.style.backgroundColor ||
        "";

      const fontWeight =
        element.style.fontWeight ||
        "";

      const fontStyle =
        element.style.fontStyle ||
        "";

      const textDecoration =
        element.style.textDecoration ||
        element.style.textDecorationLine ||
        "";

      const textAlign =
        element.style.textAlign ||
        "";

      const fontFamily =
        element.style.fontFamily ||
        "";

      const fontSize =
        element.style.fontSize ||
        "";

      const verticalAlign =
        element.style.verticalAlign ||
        "";

      const whiteSpace =
        element.style.whiteSpace ||
        "";

      element.removeAttribute("class");
      element.removeAttribute("id");
      element.removeAttribute("dir");
      element.removeAttribute("face");
      element.removeAttribute("size");
      element.removeAttribute("style");

      if (color) {
        element.style.color =
          color;
      }

      if (
        backgroundColor &&
        backgroundColor !== "transparent" &&
        backgroundColor !== "rgba(0, 0, 0, 0)"
      ) {
        element.style.backgroundColor =
          backgroundColor;
      }

      if (
        element.tagName === "B" ||
        element.tagName === "STRONG" ||
        fontWeight === "bold" ||
        Number(fontWeight) >= 600
      ) {
        element.style.fontWeight =
          "700";
      }

      if (
        element.tagName === "I" ||
        element.tagName === "EM" ||
        fontStyle === "italic" ||
        fontStyle === "oblique"
      ) {
        element.style.fontStyle =
          "italic";
      }

      const decorations: string[] = [];

      if (
        element.tagName === "U" ||
        textDecoration.includes("underline")
      ) {
        decorations.push("underline");
      }

      if (
        element.tagName === "S" ||
        element.tagName === "STRIKE" ||
        textDecoration.includes("line-through")
      ) {
        decorations.push("line-through");
      }

      if (decorations.length > 0) {
        element.style.textDecoration =
          decorations.join(" ");
      }

      if (
        ["left", "center", "right", "justify"].includes(
          textAlign
        )
      ) {
        element.style.textAlign =
          textAlign;
      }

      if (
        fontFamily &&
        fontFamily.length <= 120
      ) {
        element.style.fontFamily =
          fontFamily;
      }

      if (
        fontSize &&
        /^(?:\d+(?:\.\d+)?)(?:px|pt|em|rem|%)$/.test(
          fontSize.trim()
        )
      ) {
        element.style.fontSize =
          fontSize;
      }

      if (
        element.tagName === "SUB"
      ) {
        element.style.verticalAlign =
          "sub";
      } else if (
        element.tagName === "SUP"
      ) {
        element.style.verticalAlign =
          "super";
      } else if (
        verticalAlign === "sub" ||
        verticalAlign === "super"
      ) {
        element.style.verticalAlign =
          verticalAlign;
      }

      if (
        whiteSpace &&
        whiteSpace !== "nowrap"
      ) {
        element.style.whiteSpace =
          whiteSpace;
      }

      if (
        computedStyle.includes("text-decoration") &&
        !element.style.textDecoration &&
        computedStyle.includes("underline")
      ) {
        element.style.textDecoration =
          "underline";
      }
    }

    return doc.body.innerHTML;
  }

  function plainTextToParagraphs(
    rawText: string
  ) {
    const normalized =
      rawText
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u00A0/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim();

    if (!normalized) {
      return "";
    }

    const blocks =
      normalized
        .split(/\n{2,}/)
        .map((part) =>
          part.trim()
        )
        .filter(Boolean);

    return blocks
      .map((block) => {
        const joined =
          block
            .split("\n")
            .map((line) =>
              line.trim()
            )
            .filter(Boolean)
            .join(" ")
            .replace(/\s{2,}/g, " ");

        const safe =
          joined
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        return `<p>${safe}</p>`;
      })
      .join("");
  }

  function handleSmartPaste(
    event: React.ClipboardEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    const html =
      event.clipboardData.getData(
        "text/html"
      );

    const plain =
      event.clipboardData.getData(
        "text/plain"
      );

    const cleaned =
      html
        ? cleanPastedHtml(html)
        : plainTextToParagraphs(
            plain
          );

    if (!cleaned) return;

    document.execCommand(
      "insertHTML",
      false,
      cleaned
    );

    syncValue();
  }

  function insertHtml(html: string) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand("insertHTML", false, html);
    syncValue();
  }

  function getSelectedEditorObject() {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (
      editor &&
      selection &&
      selection.rangeCount > 0
    ) {
      let node: Node | null =
        selection.anchorNode;

      if (
        node?.nodeType ===
        Node.TEXT_NODE
      ) {
        node = node.parentNode;
      }

      if (
        node instanceof
        HTMLElement
      ) {
        const object =
          node.closest<HTMLElement>(
            "[data-editor-object]"
          );

        if (
          object &&
          editor.contains(object)
        ) {
          lastSelectedObjectRef.current =
            object;
          return object;
        }
      }
    }

    const remembered =
      lastSelectedObjectRef.current;

    if (
      remembered &&
      editor?.contains(remembered)
    ) {
      return remembered;
    }

    return null;
  }

  function getSelectedTableCell() {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (
      editor &&
      selection &&
      selection.rangeCount > 0
    ) {
      let node: Node | null =
        selection.anchorNode;

      if (
        node?.nodeType ===
        Node.TEXT_NODE
      ) {
        node = node.parentNode;
      }

      if (
        node instanceof
        HTMLElement
      ) {
        const cell =
          node.closest<
            HTMLTableCellElement
          >("td,th");

        if (
          cell &&
          editor.contains(cell)
        ) {
          lastSelectedCellRef.current =
            cell;
          return cell;
        }
      }
    }

    const remembered =
      lastSelectedCellRef.current;

    if (
      remembered &&
      editor?.contains(remembered)
    ) {
      return remembered;
    }

    return null;
  }

  function deleteSelectedObject() {
    const object = getSelectedEditorObject();

    if (!object) {
      alert("Avval jadval, shakl yoki diagramma ichini bosing.");
      return;
    }

    object.remove();
    syncValue();
  }

  function duplicateSelectedObject() {
    const object = getSelectedEditorObject();

    if (!object) {
      alert("Avval jadval, shakl yoki diagramma ichini bosing.");
      return;
    }

    const clone = object.cloneNode(true);
    object.insertAdjacentElement(
      "afterend",
      clone as HTMLElement
    );
    syncValue();
  }

  function resizeSelectedObject(
    widthDelta: number,
    heightDelta: number
  ) {
    const object =
      getSelectedEditorObject();

    if (!object) {
      alert(
        "Avval jadval, shakl yoki diagramma ichini bosing."
      );
      return;
    }

    const rect =
      object.getBoundingClientRect();

    if (widthDelta !== 0) {
      object.style.width =
        `${Math.max(
          100,
          rect.width +
            widthDelta
        )}px`;
      object.style.maxWidth =
        "100%";
    }

    if (heightDelta !== 0) {
      object.style.height =
        `${Math.max(
          50,
          rect.height +
            heightDelta
        )}px`;
    }

    object.style.overflow =
      "auto";

    syncValue();
  }

  function addTableRow() {
    const cell =
      getSelectedTableCell();

    const table =
      cell?.closest("table");

    if (!table) {
      alert(
        "Avval jadvalning bir katagini bosing."
      );
      return;
    }

    const columnCount =
      table.rows[0]?.cells.length ||
      1;

    const row =
      table.insertRow(
        cell!.parentElement
          ? (
              cell!.parentElement as HTMLTableRowElement
            ).rowIndex + 1
          : -1
      );

    for (
      let i = 0;
      i < columnCount;
      i += 1
    ) {
      const td =
        row.insertCell();

      td.textContent =
        "Matn";

      td.style.border =
        "1px solid #444";
      td.style.padding =
        "10px";
      td.style.minWidth =
        "90px";
    }

    syncValue();
  }

  function removeTableRow() {
    const cell =
      getSelectedTableCell();

    const row =
      cell?.parentElement as
        | HTMLTableRowElement
        | null;

    const table =
      cell?.closest("table");

    if (!row || !table) {
      alert(
        "Avval jadvalning bir katagini bosing."
      );
      return;
    }

    if (table.rows.length <= 1) {
      alert(
        "Jadvalda kamida 1 ta qator qolishi kerak."
      );
      return;
    }

    table.deleteRow(
      row.rowIndex
    );

    lastSelectedCellRef.current =
      null;

    syncValue();
  }

  function addTableColumn() {
    const cell =
      getSelectedTableCell();

    const table =
      cell?.closest("table");

    if (!cell || !table) {
      alert(
        "Avval jadvalning bir katagini bosing."
      );
      return;
    }

    const index =
      cell.cellIndex + 1;

    Array.from(
      table.rows
    ).forEach(
      (
        row,
        rowIndex
      ) => {
        const nextCell =
          row.insertCell(index);

        nextCell.textContent =
          rowIndex === 0
            ? "Sarlavha"
            : "Matn";

        nextCell.style.border =
          "1px solid #444";
        nextCell.style.padding =
          "10px";
        nextCell.style.minWidth =
          "90px";

        if (rowIndex === 0) {
          nextCell.style.background =
            "#dceffd";
          nextCell.style.fontWeight =
            "700";
          nextCell.style.textAlign =
            "center";
        }
      }
    );

    syncValue();
  }

  function removeTableColumn() {
    const cell =
      getSelectedTableCell();

    const table =
      cell?.closest("table");

    if (!cell || !table) {
      alert(
        "Avval jadvalning bir katagini bosing."
      );
      return;
    }

    const index =
      cell.cellIndex;

    const count =
      table.rows[0]?.cells.length ||
      0;

    if (count <= 1) {
      alert(
        "Jadvalda kamida 1 ta ustun qolishi kerak."
      );
      return;
    }

    Array.from(
      table.rows
    ).forEach((row) => {
      if (row.cells[index]) {
        row.deleteCell(index);
      }
    });

    lastSelectedCellRef.current =
      null;

    syncValue();
  }

  function insertTable() {
    const rows = Math.min(Math.max(Number(tableRows) || 1, 1), 20);
    const cols = Math.min(Math.max(Number(tableCols) || 1, 1), 10);

    let html = `
      <div data-editor-object="table" style="margin:16px 0;overflow:auto;resize:both;min-width:260px;min-height:90px;border:1px dashed #7a7a7a;padding:5px;">
        <table style="width:100%;border-collapse:collapse;background:#fff;">
    `;

    for (let r = 0; r < rows; r += 1) {
      html += "<tr>";

      for (let c = 0; c < cols; c += 1) {
        const isHeader = r === 0;

        html += isHeader
          ? `<th style="border:1px solid #444;padding:10px;background:#dceffd;text-align:center;">Sarlavha</th>`
          : `<td style="border:1px solid #444;padding:10px;min-width:90px;">Matn</td>`;
      }

      html += "</tr>";
    }

    html += "</table></div><p><br></p>";

    insertHtml(html);
    setShowTable(false);
  }

  function insertShape(kind: string) {
    const common =
      "display:inline-flex;align-items:center;justify-content:center;min-width:150px;min-height:70px;padding:14px 20px;margin:12px;border:2px solid #174461;font-weight:700;text-align:center;resize:both;overflow:auto;";

    const shapes: Record<string, string> = {
      box: `<div data-editor-object="shape" style="${common}border-radius:14px;background:#dceffd;color:#073b68;">2D blok</div><p><br></p>`,
      circle: `<div data-editor-object="shape" style="${common}width:130px;height:130px;min-width:130px;min-height:130px;border-radius:50%;background:#eaf6ff;color:#073b68;">Doira</div><p><br></p>`,
      note: `<div data-editor-object="shape" style="${common}border-radius:10px;background:#fff4a8;color:#503f00;border-color:#9f8200;">Eslatma</div><p><br></p>`,
      block3d: `<div data-editor-object="shape" style="${common}border-radius:14px;background:linear-gradient(145deg,#9bd9ff,#4e9ccc);color:#073b68;box-shadow:8px 8px 0 #17415c,14px 14px 18px rgba(0,0,0,.28);">3D blok</div><p><br></p>`,
      card3d: `<div data-editor-object="shape" style="${common}border-radius:18px;background:linear-gradient(145deg,#eeeeee,#a7a7a7);color:#111;box-shadow:inset 0 5px 5px rgba(255,255,255,.8),0 8px 0 #555,0 14px 20px rgba(0,0,0,.3);">3D kartochka</div><p><br></p>`,
      arrow: `<div data-editor-object="shape" style="${common}border:none;background:transparent;color:#174461;font-size:34px;min-width:210px;">BOSQICH 1&nbsp;&nbsp;➜&nbsp;&nbsp;BOSQICH 2</div><p><br></p>`,
      timeline: `<div data-editor-object="shape" style="margin:18px 0;padding:18px;border-radius:14px;background:#eef6fb;border:2px solid #174461;resize:both;overflow:auto;min-width:260px;min-height:70px;"><b>1-bosqich</b> ━━━ ➜ <b>2-bosqich</b> ━━━ ➜ <b>3-bosqich</b></div><p><br></p>`,
      four: `<div data-editor-object="shape" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:18px 0;resize:both;overflow:auto;min-width:320px;min-height:160px;">
        <div style="padding:18px;border-radius:14px;background:#dceffd;border:2px solid #174461;box-shadow:5px 5px 0 #17415c;"><b>1. Subyekt</b><br>Matn</div>
        <div style="padding:18px;border-radius:14px;background:#dceffd;border:2px solid #174461;box-shadow:5px 5px 0 #17415c;"><b>2. Obyekt</b><br>Matn</div>
        <div style="padding:18px;border-radius:14px;background:#dceffd;border:2px solid #174461;box-shadow:5px 5px 0 #17415c;"><b>3. Subyektiv tomon</b><br>Matn</div>
        <div style="padding:18px;border-radius:14px;background:#dceffd;border:2px solid #174461;box-shadow:5px 5px 0 #17415c;"><b>4. Obyektiv tomon</b><br>Matn</div>
      </div><p><br></p>`,
    };

    insertHtml(shapes[kind] ?? shapes.box);
    setShowShapes(false);
  }

  const colors = [
    "#000000",
    "#173e58",
    "#c62828",
    "#2e7d32",
    "#1565c0",
    "#6a1b9a",
    "#ef6c00",
    "#5d4037",
  ];

  const highlights = [
    "#fff176",
    "#b9f6ca",
    "#80d8ff",
    "#ff80ab",
    "#ffcc80",
    "#d1c4e9",
  ];

  return (
    <div className={fullscreen ? "richEditorShell fullscreen" : "richEditorShell"}>
      {label && (
        <div className="richEditorTop">
          <div className="richEditorLabel">{label}</div>

          <button
          type="button"
          className="fullScreenButton"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setFullscreen((old) => !old)}
        >
            {fullscreen ? "✕ To‘liq ekrandan chiqish" : "⛶ To‘liq ekran"}
          </button>
        </div>
      )}

      <div className="richToolbar">
        <div className="toolGroup textGroup">
          <span className="toolGroupTitle">Matn</span>

          <select
            defaultValue="Bell MT"
            title="Shrift"
            onChange={(e) => runCommand("fontName", e.target.value)}
          >
            <option>Bell MT</option>
            <option>Times New Roman</option>
            <option>Arial</option>
            <option>Calibri</option>
            <option>Georgia</option>
            <option>Verdana</option>
          </select>

          <select
            defaultValue="3"
            title="Yozuv o‘lchami"
            onChange={(e) => runCommand("fontSize", e.target.value)}
          >
            <option value="1">10</option>
            <option value="2">12</option>
            <option value="3">14</option>
            <option value="4">18</option>
            <option value="5">24</option>
            <option value="6">32</option>
            <option value="7">48</option>
          </select>

          <button type="button" title="Qalin" onMouseDown={(e) => { e.preventDefault(); runCommand("bold"); }}><b>B</b></button>
          <button type="button" title="Kursiv" onMouseDown={(e) => { e.preventDefault(); runCommand("italic"); }}><i>I</i></button>
          <button type="button" title="Tagiga chizish" onMouseDown={(e) => { e.preventDefault(); runCommand("underline"); }}><u>U</u></button>
          <button type="button" title="Ustidan chizish" onMouseDown={(e) => { e.preventDefault(); runCommand("strikeThrough"); }}><s>S</s></button>

          <div className="toolDrop">
            <button
              type="button"
              title="Matn va marker ranglari"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowColors((old) => !old)}
            >
              🎨 Rang / Marker
            </button>

            {showColors && (
              <div className="colorPopup">
                <div className="popupLabel">Matn rangi</div>
                <div className="colorGrid">
                  {colors.map((color) => (
                    <button
                      key={`text-${color}`}
                      type="button"
                      className="colorSwatch"
                      style={{ background: color }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        runCommand("foreColor", color);
                        setShowColors(false);
                      }}
                    />
                  ))}
                </div>

                <div className="popupLabel">Marker</div>
                <div className="colorGrid">
                  {highlights.map((color) => (
                    <button
                      key={`hilite-${color}`}
                      type="button"
                      className="colorSwatch"
                      style={{ background: color }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        runCommand("hiliteColor", color);
                        setShowColors(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="toolGroup paragraphGroup">
          <span className="toolGroupTitle">Abzas</span>
          <button type="button" title="Chapga tekislash" onMouseDown={(e) => { e.preventDefault(); runCommand("justifyLeft"); }}>Chap</button>
          <button type="button" title="Markazga tekislash" onMouseDown={(e) => { e.preventDefault(); runCommand("justifyCenter"); }}>Markaz</button>
          <button type="button" title="O‘ngga tekislash" onMouseDown={(e) => { e.preventDefault(); runCommand("justifyRight"); }}>O‘ng</button>
          <button type="button" title="Ikki tomonga tekislash" onMouseDown={(e) => { e.preventDefault(); runCommand("justifyFull"); }}>Justify</button>
          <select
            defaultValue="1.5"
            title="Qator oralig‘i"
            onChange={(e) =>
              applyBlockStyle("lineHeight", e.target.value)
            }
          >
            <option value="1">1.0</option>
            <option value="1.15">1.15</option>
            <option value="1.5">1.5</option>
            <option value="2">2.0</option>
            <option value="2.5">2.5</option>
            <option value="3">3.0</option>
          </select>

          <button
            type="button"
            title="Abzas oldidan masofa qo‘shish"
            onMouseDown={(e) => {
              e.preventDefault();
              applyBlockStyle("marginTop", "12px");
            }}
          >
            ↑ Interval
          </button>

          <button
            type="button"
            title="Abzasdan keyin masofa qo‘shish"
            onMouseDown={(e) => {
              e.preventDefault();
              applyBlockStyle("marginBottom", "12px");
            }}
          >
            ↓ Interval
          </button>

          <button type="button" title="Raqamli ro‘yxat" onMouseDown={(e) => { e.preventDefault(); runCommand("insertOrderedList"); }}>1. Ro‘yxat</button>
          <button type="button" title="Belgili ro‘yxat" onMouseDown={(e) => { e.preventDefault(); runCommand("insertUnorderedList"); }}>• Ro‘yxat</button>
          <button
            type="button"
            title="Faqat birinchi qator abzasini kamaytirish"
            onMouseDown={(e) => {
              e.preventDefault();
              changeFirstLineIndent("decrease");
            }}
          >
            ← 1-qator
          </button>

          <button
            type="button"
            title="Faqat birinchi qatorni ichkariga surish"
            onMouseDown={(e) => {
              e.preventDefault();
              changeFirstLineIndent("increase");
            }}
          >
            1-qator →
          </button>
          <button type="button" title="Bekor qilish" onMouseDown={(e) => { e.preventDefault(); runCommand("undo"); }}>↶ Undo</button>
          <button type="button" title="Qaytarish" onMouseDown={(e) => { e.preventDefault(); runCommand("redo"); }}>↷ Redo</button>
        </div>

        <div className="toolGroup insertGroup">
          <span className="toolGroupTitle">Qo‘shish</span>

          <div className="toolDrop">
            <button
              type="button"
              className="insertToolButton"
              title="Jadval qo‘shish"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowTable((old) => !old)}
            >
              ▦ Jadval
            </button>

            {showTable && (
              <div className="tablePopup">
                <label>
                  Qator
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tableRows}
                    onChange={(e) => setTableRows(Number(e.target.value))}
                  />
                </label>

                <label>
                  Ustun
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={tableCols}
                    onChange={(e) => setTableCols(Number(e.target.value))}
                  />
                </label>

                <button type="button" className="insertTableButton" onClick={insertTable}>
                  Jadvalni qo‘shish
                </button>
              </div>
            )}
          </div>

          <div className="toolDrop">
            <button
              type="button"
              className="insertToolButton"
              title="Shakl yoki 3D element qo‘shish"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowShapes((old) => !old)}
            >
              ◈ Shakl / 3D
            </button>

            {showShapes && (
              <div className="shapePopup">
                <button type="button" onClick={() => insertShape("box")}>▭ 2D blok</button>
                <button type="button" onClick={() => insertShape("circle")}>◯ Doira</button>
                <button type="button" onClick={() => insertShape("note")}>▰ Eslatma</button>
                <button type="button" onClick={() => insertShape("block3d")}>◈ 3D blok</button>
                <button type="button" onClick={() => insertShape("card3d")}>▣ 3D kartochka</button>
                <button type="button" onClick={() => insertShape("arrow")}>➜ Strelka</button>
                <button type="button" onClick={() => insertShape("timeline")}>━━➜ Timeline</button>
                <button type="button" onClick={() => insertShape("four")}>⊞ To‘rtburchak bloklar</button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="insertToolButton"
            title="Tarmoqlanuvchi diagramma"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowDiagramBuilder(true)}
          >
            ⤴ Diagramma
          </button>

          <button
            type="button"
            className="insertToolButton"
            title="Gorizontal chiziq"
            onMouseDown={(e) => {
              e.preventDefault();
              insertHtml('<hr style="margin:18px 0;border:none;border-top:2px solid #555;"><p><br></p>');
            }}
          >
            ━ Chiziq
          </button>
        </div>

        <div className="toolGroup objectGroup">
          <span className="toolGroupTitle">Obyekt</span>

          <button
            type="button"
            title="Tanlangan obyekt kengligini kichraytirish"
            onClick={() =>
              resizeSelectedObject(
                -40,
                0
              )
            }
          >
            En −
          </button>

          <button
            type="button"
            title="Tanlangan obyekt kengligini oshirish"
            onClick={() =>
              resizeSelectedObject(
                40,
                0
              )
            }
          >
            En +
          </button>

          <button
            type="button"
            title="Tanlangan obyekt balandligini kichraytirish"
            onClick={() =>
              resizeSelectedObject(
                0,
                -30
              )
            }
          >
            Bo‘y −
          </button>

          <button
            type="button"
            title="Tanlangan obyekt balandligini oshirish"
            onClick={() =>
              resizeSelectedObject(
                0,
                30
              )
            }
          >
            Bo‘y +
          </button>

          <button
            type="button"
            title="Tanlangan jadval/shakl/diagrammani nusxalash"
            onClick={duplicateSelectedObject}
          >
            Nusxalash
          </button>

          <button
            type="button"
            className="dangerTool"
            title="Tanlangan jadval/shakl/diagrammani o‘chirish"
            onClick={deleteSelectedObject}
          >
            O‘chirish
          </button>

          <span className="toolSeparator" />

          <button
            type="button"
            title="Tanlangan jadval katagidan keyin qator qo‘shish"
            onClick={addTableRow}
          >
            + Qator
          </button>

          <button
            type="button"
            title="Tanlangan jadval qatorini o‘chirish"
            onClick={removeTableRow}
          >
            − Qator
          </button>

          <button
            type="button"
            title="Tanlangan jadval katagidan keyin ustun qo‘shish"
            onClick={addTableColumn}
          >
            + Ustun
          </button>

          <button
            type="button"
            title="Tanlangan jadval ustunini o‘chirish"
            onClick={removeTableColumn}
          >
            − Ustun
          </button>

          <span className="toolSeparator" />

          <button
            type="button"
            title="Matn formatini tozalash"
            onMouseDown={(e) => {
              e.preventDefault();
              runCommand("removeFormat");
            }}
          >
            Tx Tozalash
          </button>
        </div>
      </div>

      {showDiagramBuilder && (
        <DiagramBuilder
          onClose={() =>
            setShowDiagramBuilder(false)
          }
          onInsert={(html) => {
            insertHtml(html);
            setShowDiagramBuilder(false);
          }}
        />
      )}

      <div
        ref={editorRef}
        className={
          paragraphMode === "question"
            ? "richEditor questionParagraphMode"
            : "richEditor normalParagraphMode"
        }
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={syncValue}
        onBlur={syncValue}
        onMouseDown={(event) => {
          const target =
            event.target instanceof
            HTMLElement
              ? event.target
              : null;

          const object =
            target?.closest<
              HTMLElement
            >(
              "[data-editor-object]"
            ) ?? null;

          const cell =
            target?.closest<
              HTMLTableCellElement
            >("td,th") ?? null;

          if (
            lastSelectedObjectRef.current &&
            lastSelectedObjectRef.current !==
              object
          ) {
            lastSelectedObjectRef.current.style.outline =
              "";
            lastSelectedObjectRef.current.style.outlineOffset =
              "";
          }

          if (object) {
            lastSelectedObjectRef.current =
              object;
            object.style.outline =
              "2px solid #2196f3";
            object.style.outlineOffset =
              "3px";
          }

          if (cell) {
            lastSelectedCellRef.current =
              cell;
          }
        }}
        onPaste={handleSmartPaste}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            document.execCommand("formatBlock", false, "p");
            document.execCommand("insertParagraph", false);
            syncValue();
          }
        }}
      />

      <div className="richEditorHint">
        Word/PDF’dan qo‘yilganda qalin, kursiv, tagiga chizilgan, rangli va markerli joylar imkon qadar saqlanadi; keraksiz PDF joylashuv kodlari tozalanadi. Diagrammada O‘ng/Chap/Past/Tepa blok qo‘shish, 8 nuqtadan resize, tagidan matn yozish; jadvalda qator/ustun qo‘shish-o‘chirish; obyektlarda en/bo‘y, nusxalash va o‘chirish mavjud.
      </div>

      <style jsx>{`
        .richEditorShell {
          position: relative;
          width: 100%;
          border: 3px solid #4a5257;
          border-radius: 15px;
          background: #d7d7d7;
          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.75),
            0 5px 0 #343a3e;
        }

        .richEditorShell.fullscreen {
          position: fixed;
          z-index: 9999;
          inset: 12px;
          width: auto;
          height: calc(100vh - 24px);
          display: flex;
          flex-direction: column;
          background: #c9c9c9;
        }

        .richEditorTop {
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid #858585;
        }

        .richEditorLabel {
          color: #173e58;
          font-size: 16px;
          font-weight: 700;
        }

        .fullScreenButton {
          padding: 7px 12px;
          border: 2px solid #4e565b;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
          background: linear-gradient(#fff,#bdbdbd);
        }

        .richToolbar {
          position: relative;
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
          border-bottom: 2px solid #777;
          background: linear-gradient(#f5f5f5,#c1c1c1);
        }

        .toolGroup {
          position: relative;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
          padding: 8px 10px 8px 82px;
          border: 1px solid rgba(70,70,70,.35);
          border-radius: 10px;
          background: rgba(255,255,255,.35);
        }

        .toolGroupTitle {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 62px;
          color: #173e58;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
        }

        .insertToolButton {
          color: #073b68;
          border-color: #174461 !important;
          background: linear-gradient(#ccefff,#6fb9e4) !important;
          box-shadow: 0 3px 0 #17415c;
        }

        .toolSeparator {
          width: 1px;
          align-self: stretch;
          min-height: 32px;
          margin: 0 3px;
          background: rgba(60,60,60,.35);
        }

        .dangerTool {
          color: #8a1f1f;
          border-color: #8a3131 !important;
          background: linear-gradient(#ffe4e4,#e9b1b1) !important;
        }

        .richToolbar button,
        .richToolbar select,
        .toolDrop > button {
          min-height: 38px;
          padding: 6px 10px;
          border: 2px solid #545b60;
          border-radius: 7px;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          background: linear-gradient(#fff,#c9c9c9);
        }

        .richToolbar button:hover,
        .toolDrop > button:hover,
        .fullScreenButton:hover {
          filter: brightness(1.08);
        }

        .toolDrop {
          position: relative;
        }

        .colorPopup,
        .tablePopup,
        .shapePopup {
          position: absolute;
          z-index: 50;
          top: calc(100% + 7px);
          left: 0;
          min-width: 230px;
          padding: 12px;
          border: 2px solid #555;
          border-radius: 10px;
          background: #f4f4f4;
          box-shadow: 0 10px 24px rgba(0,0,0,.3);
        }

        .popupLabel {
          margin: 4px 0 8px;
          color: #173e58;
          font-weight: 700;
        }

        .colorGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 7px;
          margin-bottom: 12px;
        }

        .colorSwatch {
          width: 38px;
          height: 32px;
          padding: 0;
          border: 2px solid #555;
          border-radius: 5px;
          cursor: pointer;
        }

        .tablePopup {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .tablePopup label {
          color: #173e58;
          font-size: 14px;
        }

        .tablePopup input {
          width: 100%;
          margin-top: 5px;
          padding: 7px;
          border: 1px solid #555;
          border-radius: 6px;
        }

        .insertTableButton {
          grid-column: 1 / -1;
          padding: 9px;
          border: 2px solid #174461;
          border-radius: 7px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
          background: #9bd9ff;
        }

        .shapePopup {
          min-width: 250px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .shapePopup button {
          padding: 9px;
          border: 2px solid #555;
          border-radius: 7px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
          background: #e9e9e9;
        }

        .richEditor {
          padding: 22px;
          outline: none;
          overflow: auto;
          color: #111;
          font-family: "Bell MT","Times New Roman",serif;
          font-size: 18px;
          line-height: 1.6;
          letter-spacing: normal;
          word-spacing: normal;
          background: #fff;
        }

        .fullscreen .richEditor {
          flex: 1;
          min-height: 0 !important;
        }

        .richEditor:empty::before {
          content: attr(data-placeholder);
          color: #8b8b8b;
          pointer-events: none;
        }

        .normalParagraphMode {
          text-align: left;
          overflow-wrap: break-word;
          word-break: normal;
          white-space: normal;
        }

        .normalParagraphMode :global(p),
        .normalParagraphMode :global(div) {
          margin: 0 0 12px;
          text-align: inherit;
          text-indent: 0;
        }

        .questionParagraphMode {
          text-align: justify;
          text-justify: inter-word;
          overflow-wrap: break-word;
          word-break: normal;
        }

        .questionParagraphMode :global(p),
        .questionParagraphMode :global(div) {
          display: inline;
          margin: 0;
          text-align: justify;
          text-indent: 0;
        }

        .questionParagraphMode :global(p + p),
        .questionParagraphMode :global(div + div) {
          display: block;
          margin-top: 10px;
        }

        .richEditorHint {
          padding: 9px 12px;
          color: #35464f;
          font-size: 13px;
          font-weight: 700;
          background: #dceffd;
          border-top: 1px solid #8aa7b8;
        }

        @media (max-width: 700px) {
          .richEditorShell.fullscreen {
            inset: 4px;
            height: calc(100vh - 8px);
          }

          .richToolbar {
            gap: 6px;
          }

          .toolGroup {
            padding: 34px 7px 7px;
          }

          .toolGroupTitle {
            top: 8px;
            left: 9px;
            width: auto;
            transform: none;
          }

          .richToolbar > button,
          .richToolbar select,
          .toolDrop > button {
            min-height: 34px;
            padding: 5px 8px;
            font-size: 12px;
          }

          .colorPopup,
          .tablePopup,
          .shapePopup {
            left: 50%;
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

export default function KazuslarPage() {
  const [mode, setMode] = useState<Mode>("list");

  const [role, setRole] = useState<UserRole>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [cases, setCases] = useState<AnyCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState("");

  const [subjects, setSubjects] = useState<SubjectFolder[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState("");

  const [selectedCourse, setSelectedCourse] =
    useState<CourseNumber | null>(null);
  const [selectedSemester, setSelectedSemester] =
    useState<SemesterNumber | null>(null);
  const [selectedSubject, setSelectedSubject] =
    useState<SubjectFolder | null>(null);

  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [editingSubjectId, setEditingSubjectId] =
    useState<string | null>(null);
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [subjectMessage, setSubjectMessage] = useState("");

  const [selectedCase, setSelectedCase] = useState<PlatformCase | null>(null);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);

  const [viewerZoom, setViewerZoom] = useState(100);
  const [viewerMarkerMode, setViewerMarkerMode] =
    useState<"off" | "mark" | "erase">("off");
  const [viewerMarkerColor, setViewerMarkerColor] = useState("#fff176");
  const viewerContentRef = useRef<HTMLDivElement | null>(null);

  const [subject, setSubject] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
  const [caseText, setCaseText] = useState("");

  const [questions, setQuestions] = useState<CaseQuestion[]>([
    {
      id: "1",
      question: "",
      answer: "",
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [search, setSearch] = useState("");

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfSubject, setPdfSubject] = useState("");
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");

  useEffect(() => {
    loadRole();
    loadCases();
    loadSubjects();
  }, []);

  async function loadRole() {
    try {
      const response = await fetch("/api/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Rolni aniqlab bo‘lmadi.");
      }

      const data = await response.json();

      if (data.role === "admin") {
        setRole("admin");
      } else {
        setRole("user");
      }
    } catch (error) {
      console.error("ROLE ERROR:", error);
      setRole("user");
    } finally {
      setRoleLoading(false);
    }
  }

  async function loadCases() {
    try {
      setCasesLoading(true);
      setCasesError("");

      const response = await fetch("/api/kazuslar", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Kazuslarni yuklab bo‘lmadi.");
      }

      setCases(Array.isArray(data.cases) ? data.cases : []);
    } catch (error) {
      console.error("CASES LOAD ERROR:", error);

      setCasesError(
        error instanceof Error
          ? error.message
          : "Kazuslarni yuklashda xatolik."
      );
    } finally {
      setCasesLoading(false);
    }
  }

  async function loadSubjects() {
    try {
      setSubjectsLoading(true);
      setSubjectsError("");

      const response = await fetch("/api/kazuslar/fanlar?category=YN", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Fanlarni yuklab bo‘lmadi."
        );
      }

      setSubjects(
        Array.isArray(data.subjects)
          ? data.subjects
          : []
      );
    } catch (error) {
      console.error("SUBJECTS LOAD ERROR:", error);

      setSubjectsError(
        error instanceof Error
          ? error.message
          : "Fanlarni yuklashda xatolik."
      );
    } finally {
      setSubjectsLoading(false);
    }
  }


  function goBack() {
    if (mode !== "list") {
      setMode("list");
      setSelectedCase(null);
      setSaveMessage("");
      setPdfMessage("");
      return;
    }

    if (selectedSubject) {
      setSelectedSubject(null);
      setSearch("");
      return;
    }

    if (selectedSemester) {
      setSelectedSemester(null);
      return;
    }

    if (selectedCourse) {
      setSelectedCourse(null);
      return;
    }

    window.location.href = "/";
  }

  function semestersForCourse(course: CourseNumber) {
    const first = ((course - 1) * 2 + 1) as SemesterNumber;
    const second = (first + 1) as SemesterNumber;
    return [first, second];
  }

  function normalizeSubjectName(value: string) {
    return value
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("uz");
  }

  const EXAM_KIND = "YN";
  const EXAM_TITLE = "Yakuniy nazorat kazuslari";

  function examSubjectName(name: string) {
    return `[${EXAM_KIND}|${selectedCourse ?? 0}|${selectedSemester ?? 0}] ${name.trim()}`;
  }

  function resetSubjectForm() {
    setNewSubjectName("");
    setEditingSubjectId(null);
    setSubjectMessage("");
    setShowSubjectForm(false);
  }

  function openAddSubjectForm() {
    if (
      role !== "admin" ||
      !selectedCourse ||
      !selectedSemester
    ) {
      return;
    }

    setNewSubjectName("");
    setEditingSubjectId(null);
    setSubjectMessage("");
    setShowSubjectForm(true);
  }

  function openEditSubjectForm(item: SubjectFolder) {
    if (role !== "admin") return;

    setNewSubjectName(item.name);
    setEditingSubjectId(item.id);
    setSubjectMessage("");
    setShowSubjectForm(true);
  }

  async function saveSubject() {
    if (
      role !== "admin" ||
      !selectedCourse ||
      !selectedSemester
    ) {
      setSubjectMessage("Fan qo‘shish faqat administrator uchun.");
      return;
    }

    const cleanName = newSubjectName
      .trim()
      .replace(/\s+/g, " ");

    if (!cleanName) {
      setSubjectMessage("Fan nomini kiriting.");
      return;
    }

    const duplicate = subjects.some(
      (item) =>
        item.course === selectedCourse &&
        item.semester === selectedSemester &&
        item.id !== editingSubjectId &&
        normalizeSubjectName(item.name) ===
          normalizeSubjectName(cleanName)
    );

    if (duplicate) {
      setSubjectMessage("Bu fan ushbu semestrda allaqachon mavjud.");
      return;
    }

    try {
      setSubjectSaving(true);
      setSubjectMessage("");

      const response = await fetch("/api/kazuslar/fanlar?category=YN", {
        method: editingSubjectId ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(editingSubjectId
            ? { id: editingSubjectId }
            : {}),
          name: cleanName,
          category: "YN",
          course: selectedCourse,
          semester: selectedSemester,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Fanni saqlab bo‘lmadi."
        );
      }

      await loadSubjects();

      setSubjectMessage(
        editingSubjectId
          ? "✅ Fan nomi yangilandi."
          : "✅ Fan qo‘shildi."
      );

      window.setTimeout(() => {
        resetSubjectForm();
      }, 650);
    } catch (error) {
      console.error("SUBJECT SAVE ERROR:", error);

      setSubjectMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Fanni saqlashda xatolik."
      );
    } finally {
      setSubjectSaving(false);
    }
  }

  async function deleteSubject(item: SubjectFolder) {
    if (role !== "admin") return;

    const insideCount = cases.filter(
      (caseItem) =>
        normalizeSubjectName(caseItem.subject) ===
        normalizeSubjectName(item.name)
    ).length;

    const confirmed = window.confirm(
      insideCount > 0
        ? `“${item.name}” fanida ${insideCount} ta kazus/PDF bor.\n\nAvval ichidagi materiallarni o‘chirish tavsiya qilinadi.\n\nBaribir fanni o‘chirmoqchimisiz?`
        : `“${item.name}” fanini o‘chirmoqchimisiz?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/kazuslar/fanlar?id=${encodeURIComponent(item.id)}&category=YN`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: item.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Fanni o‘chirib bo‘lmadi."
        );
      }

      setSubjects((old) =>
        old.filter((subjectItem) => subjectItem.id !== item.id)
      );

      if (selectedSubject?.id === item.id) {
        setSelectedSubject(null);
      }
    } catch (error) {
      console.error("SUBJECT DELETE ERROR:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Fanni o‘chirishda xatolik."
      );
    }
  }

  function resetForm() {
    setSubject("");
    setCaseTitle("");
    setCaseText("");
    setQuestions([
      {
        id: "1",
        question: "",
        answer: "",
      },
    ]);
    setEditingCaseId(null);
    setSaveMessage("");
  }

  function openEditMode(item: PlatformCase) {
    if (role !== "admin") return;

    setEditingCaseId(item.id);
    setSubject(item.subject);
    setCaseTitle(item.title);
    setCaseText(item.caseText);
    setQuestions(
      item.questions.length > 0
        ? item.questions.map((question) => ({ ...question }))
        : [
            {
              id: "1",
              question: "",
              answer: "",
            },
          ]
    );
    setSaveMessage("");
    setMode("write");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openWriteMode() {
    if (!selectedSubject) {
      alert("Avval fan ichiga kiring.");
      return;
    }

    resetForm();
    setSubject(examSubjectName(selectedSubject.name));
    setMode("write");
  }

  function openUploadMode() {
    if (!selectedSubject) {
      alert("Avval fan ichiga kiring.");
      return;
    }

    setSaveMessage("");
    setPdfFile(null);
    setPdfSubject(examSubjectName(selectedSubject.name));
    setPdfTitle("");
    setPdfMessage("");
    setMode("upload");
  }

  async function uploadPdf() {
    if (role !== "admin") {
      setPdfMessage("❌ PDF yuklash faqat administrator uchun.");
      return;
    }

    if (!pdfSubject.trim()) {
      setPdfMessage("❌ Fan nomini kiriting.");
      return;
    }

    if (!pdfTitle.trim()) {
      setPdfMessage("❌ Kazus nomini kiriting.");
      return;
    }

    if (!pdfFile) {
      setPdfMessage("❌ Avval PDF faylni tanlang.");
      return;
    }

    if (
      pdfFile.type !== "application/pdf" &&
      !pdfFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setPdfMessage("❌ Faqat PDF fayl yuklash mumkin.");
      return;
    }

    if (pdfFile.size > 10 * 1024 * 1024) {
      setPdfMessage("❌ PDF hajmi 10 MB dan oshmasligi kerak.");
      return;
    }

    try {
      setPdfUploading(true);
      setPdfMessage("");

      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("subject", pdfSubject.trim());
      formData.append("title", pdfTitle.trim());

      const response = await fetch("/api/kazuslar/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.message || "PDF faylni yuklab bo‘lmadi."
        );
      }

      setPdfMessage("✅ PDF muvaffaqiyatli yuklandi.");
      setPdfFile(null);
      setPdfSubject("");
      setPdfTitle("");

      await loadCases();

      window.setTimeout(() => {
        setPdfMessage("");
        setMode("list");
      }, 1000);
    } catch (error) {
      console.error("PDF UPLOAD ERROR:", error);

      setPdfMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ PDF yuklashda xatolik yuz berdi."
      );
    } finally {
      setPdfUploading(false);
    }
  }

  function addQuestion() {
    setQuestions((old) => [
      ...old,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        question: "",
        answer: "",
      },
    ]);
  }

  function removeQuestion(id: string) {
    if (questions.length <= 1) return;

    setQuestions((old) => old.filter((item) => item.id !== id));
  }

  function changeQuestion(
    id: string,
    field: "question" | "answer",
    value: string
  ) {
    setQuestions((old) =>
      old.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  async function saveCase() {
    if (role !== "admin") {
      setSaveMessage("Kazus qo‘shish faqat administrator uchun.");
      return;
    }

    const cleanSubject = subject.trim();
    const cleanTitle = caseTitle.trim();
    const cleanCaseText = caseText.trim();

    if (!cleanSubject) {
      setSaveMessage("Fan nomini kiriting.");
      return;
    }

    if (!cleanTitle) {
      setSaveMessage("Kazus nomini kiriting.");
      return;
    }

    if (!cleanCaseText) {
      setSaveMessage("Kazus matnini kiriting.");
      return;
    }

    const cleanQuestions = questions
      .map((item) => ({
        id: item.id,
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question && item.answer);

    if (cleanQuestions.length === 0) {
      setSaveMessage("Kamida bitta savol va uning javobini to‘liq yozing.");
      return;
    }

    try {
      setSaving(true);
      setSaveMessage("");

      const response = await fetch("/api/kazuslar", {
        method: editingCaseId ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(editingCaseId ? { id: editingCaseId } : {}),
          subject: cleanSubject,
          title: cleanTitle,
          caseText: cleanCaseText,
          questions: cleanQuestions,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Kazusni saqlab bo‘lmadi.");
      }

      setSaveMessage(
        editingCaseId
          ? "✅ Kazus muvaffaqiyatli tahrirlandi."
          : "✅ Kazus muvaffaqiyatli saqlandi."
      );

      await loadCases();

      window.setTimeout(() => {
        resetForm();
        setMode("list");
      }, 900);
    } catch (error) {
      console.error("SAVE CASE ERROR:", error);

      setSaveMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Kazusni saqlashda xatolik."
      );
    } finally {
      setSaving(false);
    }
  }


  function changeViewerZoom(delta: number) {
    setViewerZoom((old) =>
      Math.min(200, Math.max(70, old + delta))
    );
  }

  function clearViewerSelection() {
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();
  }

  function applyViewerHighlight() {
    if (viewerMarkerMode !== "mark") return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const range = selection.getRangeAt(0);
    const root = viewerContentRef.current;

    if (
      !root ||
      !root.contains(range.commonAncestorContainer)
    ) {
      return;
    }

    try {
      const fragment = range.extractContents();
      const mark = document.createElement("span");
      mark.setAttribute("data-reader-highlight", "1");
      mark.style.background = viewerMarkerColor;
      mark.style.borderRadius = "3px";
      mark.style.padding = "0 1px";
      mark.appendChild(fragment);
      range.insertNode(mark);
      clearViewerSelection();
    } catch (error) {
      console.error("MARKER ERROR:", error);
    }
  }

  function unwrapReaderHighlight(element: HTMLElement) {
    const parent = element.parentNode;
    if (!parent) return;

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }

    parent.removeChild(element);
    parent.normalize();
  }

  function eraseSelectedViewerHighlights() {
    const root = viewerContentRef.current;
    const selection = window.getSelection();

    if (
      !root ||
      !selection ||
      selection.rangeCount === 0
    ) {
      return false;
    }

    const range = selection.getRangeAt(0);

    const highlights = Array.from(
      root.querySelectorAll<HTMLElement>(
        '[data-reader-highlight="1"]'
      )
    );

    const matches = highlights.filter((highlight) => {
      try {
        return range.intersectsNode(highlight);
      } catch {
        return false;
      }
    });

    if (matches.length === 0) {
      return false;
    }

    matches.forEach(unwrapReaderHighlight);
    clearViewerSelection();

    return true;
  }

  function eraseViewerHighlight(target: EventTarget | null) {
    if (viewerMarkerMode !== "erase") return;

    if (eraseSelectedViewerHighlights()) {
      return;
    }

    let element: HTMLElement | null = null;

    if (target instanceof HTMLElement) {
      element = target.closest<HTMLElement>(
        '[data-reader-highlight="1"]'
      );
    } else if (target instanceof Node) {
      element =
        target.parentElement?.closest<HTMLElement>(
          '[data-reader-highlight="1"]'
        ) ?? null;
    }

    if (!element) return;

    unwrapReaderHighlight(element);
    clearViewerSelection();
  }

  async function deleteCase(item: AnyCase) {
    if (role !== "admin") return;

    const confirmed = window.confirm(
      `“${item.title}” kazusini butunlay o‘chirmoqchimisiz?\n\nBu amalni ortga qaytarib bo‘lmaydi.`
    );

    if (!confirmed) return;

    try {
      setDeletingCaseId(item.id);
      setCasesError("");

      let response = await fetch(
        `/api/kazuslar?id=${encodeURIComponent(item.id)}&type=${encodeURIComponent(item.type)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: item.id,
            type: item.type,
          }),
        }
      );

      // PDF uchun alohida upload route DELETE ishlatilgan loyihalarda fallback.
      if (!response.ok && item.type === "pdf") {
        response = await fetch(
          `/api/kazuslar/upload?id=${encodeURIComponent(item.id)}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: item.id,
              type: item.type,
            }),
          }
        );
      }

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Kazusni o‘chirib bo‘lmadi. API DELETE route tekshirilishi kerak."
        );
      }

      setCases((old) =>
        old.filter((caseItem) => caseItem.id !== item.id)
      );

      if (selectedCase?.id === item.id) {
        setSelectedCase(null);
        setMode("list");
      }
    } catch (error) {
      console.error("DELETE CASE ERROR:", error);

      setCasesError(
        error instanceof Error
          ? error.message
          : "Kazusni o‘chirishda xatolik."
      );
    } finally {
      setDeletingCaseId(null);
    }
  }

  async function openCase(item: AnyCase) {
    if (item.type === "pdf") {
      const viewerUrl =
        `/talabalar/kazuslar/pdf/${encodeURIComponent(item.id)}`;

      window.open(
        viewerUrl,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }

    try {
      setViewerZoom(100);
      setViewerMarkerMode("off");
      setSelectedCase(item);
      setMode("view");

      const response = await fetch(
        `/api/kazuslar?id=${encodeURIComponent(item.id)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (
        response.ok &&
        data.success &&
        data.case &&
        data.case.type === "platform"
      ) {
        setSelectedCase(data.case);
      }
    } catch (error) {
      console.error("OPEN CASE ERROR:", error);
    }
  }

  const filteredCases = useMemo(() => {
    if (!selectedSubject) {
      return [];
    }

    const q = search.trim().toLocaleLowerCase("uz");
    const selectedName =
      normalizeSubjectName(examSubjectName(selectedSubject.name));

    return cases.filter((item) => {
      if (
        normalizeSubjectName(item.subject) !== selectedName
      ) {
        return false;
      }

      if (!q) return true;

      const extraText =
        item.type === "platform"
          ? item.caseText
          : item.originalFileName;

      const searchable =
        `${item.title} ${extraText}`
          .toLocaleLowerCase("uz");

      return searchable.includes(q);
    });
  }, [cases, search, selectedSubject]);

  const subjectsForSelectedSemester = useMemo(() => {
    if (!selectedCourse || !selectedSemester) {
      return [];
    }

    return subjects
      .filter(
        (item) =>
          item.course === selectedCourse &&
          item.semester === selectedSemester
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name, "uz")
      );
  }, [subjects, selectedCourse, selectedSemester]);

  return (
    <main
      className={
        mode === "view" && role !== "admin"
          ? "page protectedReaderPage"
          : "page"
      }
      onContextMenu={(event) => {
        if (mode === "view" && role !== "admin") {
          event.preventDefault();
        }
      }}
      onCopy={(event) => {
        if (mode === "view" && role !== "admin") {
          event.preventDefault();
        }
      }}
      onCut={(event) => {
        if (mode === "view" && role !== "admin") {
          event.preventDefault();
        }
      }}
      onDragStart={(event) => {
        if (mode === "view" && role !== "admin") {
          event.preventDefault();
        }
      }}
      onKeyDownCapture={(event) => {
        if (mode !== "view" || role === "admin") return;

        const key = event.key.toLowerCase();

        if (
          (event.ctrlKey || event.metaKey) &&
          ["c", "x", "s", "p"].includes(key)
        ) {
          event.preventDefault();
        }
      }}
    >
      <header className="topPanel">
        <div className="titlePlate">Talabalar — Kazuslar</div>

        <button className="backButton" type="button" onClick={goBack}>
          Orqaga
        </button>
      </header>

      {mode === "list" && (
        <>
          <section className="controlBox examLinksOnly">
            <button
              className="mainActionButton examActionButton"
              type="button"
              onClick={() => {
                window.location.href = "/talabalar/kazuslar/yakuniy";
              }}
            >
              Yakuniy nazorat kazuslari
            </button>

            <button
              className="mainActionButton examActionButton"
              type="button"
              onClick={() => {
                window.location.href = "/talabalar/kazuslar/oraliq";
              }}
            >
              Oraliq nazorat kazuslari
            </button>

            <button
              className="mainActionButton examActionButton"
              type="button"
              onClick={() => {
                window.location.href = "/talabalar/kazuslar/qoidalar";
              }}
            >
              Kazusga javob yozish qoidalari
            </button>
          </section>

          <section className="mainBox hierarchyBox">
            <div className="sectionTitle">
              {selectedSubject
                ? selectedSubject.name
                : selectedSemester
                  ? `${selectedSemester}-semestr fanlari`
                  : selectedCourse
                    ? `${selectedCourse}-kurs semestrlari`
                    : EXAM_TITLE}
            </div>

            <div className="breadcrumbRow">
              <button
                type="button"
                className={!selectedCourse ? "crumb active" : "crumb"}
                onClick={() => {
                  setSelectedCourse(null);
                  setSelectedSemester(null);
                  setSelectedSubject(null);
                  setSearch("");
                }}
              >
                Kazuslar
              </button>

              {selectedCourse && (
                <>
                  <span>›</span>
                  <button
                    type="button"
                    className={!selectedSemester ? "crumb active" : "crumb"}
                    onClick={() => {
                      setSelectedSemester(null);
                      setSelectedSubject(null);
                      setSearch("");
                    }}
                  >
                    {selectedCourse}-kurs
                  </button>
                </>
              )}

              {selectedSemester && (
                <>
                  <span>›</span>
                  <button
                    type="button"
                    className={!selectedSubject ? "crumb active" : "crumb"}
                    onClick={() => {
                      setSelectedSubject(null);
                      setSearch("");
                    }}
                  >
                    {selectedSemester}-semestr
                  </button>
                </>
              )}

              {selectedSubject && (
                <>
                  <span>›</span>
                  <span className="crumb active">
                    {selectedSubject.name}
                  </span>
                </>
              )}
            </div>

            {!selectedCourse && (
              <div className="courseGrid">
                {([1, 2, 3, 4] as CourseNumber[]).map((course) => (
                  <button
                    key={course}
                    type="button"
                    className="hierarchyCard courseCard3D"
                    onClick={() => {
                      setSelectedCourse(course);
                      setSelectedSemester(null);
                      setSelectedSubject(null);
                    }}
                  >
                    <span className="hierarchyBig">{course}-kurs</span>
                    <span className="hierarchySmall">
                      {course === 1
                        ? "1–2-semestr"
                        : course === 2
                          ? "3–4-semestr"
                          : course === 3
                            ? "5–6-semestr"
                            : "7–8-semestr"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedCourse && !selectedSemester && (
              <div className="semesterGrid">
                {semestersForCourse(selectedCourse).map((semester) => (
                  <button
                    key={semester}
                    type="button"
                    className="hierarchyCard semesterCard3D"
                    onClick={() => {
                      setSelectedSemester(semester);
                      setSelectedSubject(null);
                    }}
                  >
                    <span className="hierarchyBig">{semester}-semestr</span>
                    <span className="hierarchySmall">
                      Fanlarni ko‘rish
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedCourse && selectedSemester && !selectedSubject && (
              <>
                {!roleLoading && role === "admin" && (
                  <div className="subjectAdminBar">
                    <button
                      type="button"
                      className="addSubjectButton"
                      onClick={openAddSubjectForm}
                    >
                      + Fan qo‘shish
                    </button>

                    <button
                      type="button"
                      className="refreshButton"
                      onClick={loadSubjects}
                      disabled={subjectsLoading}
                    >
                      {subjectsLoading ? "Yuklanmoqda..." : "Yangilash"}
                    </button>
                  </div>
                )}

                {showSubjectForm && role === "admin" && (
                  <div className="subjectForm3D">
                    <label>
                      Fan nomi
                      <input
                        type="text"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        placeholder="Masalan: Fuqarolik huquqi"
                        autoFocus
                      />
                    </label>

                    <div className="subjectFormActions">
                      <button
                        type="button"
                        className="saveSubjectButton"
                        onClick={saveSubject}
                        disabled={subjectSaving}
                      >
                        {subjectSaving
                          ? "Saqlanmoqda..."
                          : editingSubjectId
                            ? "Fan nomini saqlash"
                            : "Fanni qo‘shish"}
                      </button>

                      <button
                        type="button"
                        className="cancelSubjectButton"
                        onClick={resetSubjectForm}
                      >
                        Bekor qilish
                      </button>
                    </div>

                    {subjectMessage && (
                      <div className="subjectMessage">{subjectMessage}</div>
                    )}
                  </div>
                )}

                {subjectsError && (
                  <div className="errorBox">{subjectsError}</div>
                )}

                {subjectsLoading ? (
                  <div className="emptyState">Fanlar yuklanmoqda...</div>
                ) : subjectsForSelectedSemester.length === 0 ? (
                  <div className="emptyState">
                    Hozircha bu semestrga fan qo‘shilmagan.
                  </div>
                ) : (
                  <div className="subjectsGrid">
                    {subjectsForSelectedSemester.map((item) => {
                      const materialCount = cases.filter(
                        (caseItem) =>
                          normalizeSubjectName(caseItem.subject) ===
                          normalizeSubjectName(
                            `[${EXAM_KIND}|${item.course}|${item.semester}] ${item.name}`
                          )
                      ).length;

                      return (
                        <article className="subjectFolderCard" key={item.id}>
                          <button
                            type="button"
                            className="subjectFolderOpen"
                            onClick={() => {
                              setSelectedSubject(item);
                              setSearch("");
                            }}
                          >
                            <span className="folderName3D">{item.name}</span>
                            <span className="materialCount">
                              {materialCount} ta material
                            </span>
                          </button>

                          {!roleLoading && role === "admin" && (
                            <div className="subjectFolderAdmin">
                              <button
                                type="button"
                                className="miniEditButton"
                                onClick={() => openEditSubjectForm(item)}
                              >
                                Tahrirlash
                              </button>

                              <button
                                type="button"
                                className="miniDeleteButton"
                                onClick={() => deleteSubject(item)}
                              >
                                O‘chirish
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {selectedSubject && (
              <>
                {!roleLoading && role === "admin" && (
                  <section className="subjectMaterialActions">
                    <button
                      className="mainActionButton"
                      type="button"
                      onClick={openWriteMode}
                    >
                      Kazus yozish
                    </button>

                    <button
                      className="mainActionButton"
                      type="button"
                      onClick={openUploadMode}
                    >
                      PDF yuklash
                    </button>
                  </section>
                )}

                <div className="searchRow">
                  <input
                    className="searchInput"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`${selectedSubject.name} ichidan qidirish...`}
                  />

                  <button
                    className="refreshButton"
                    type="button"
                    onClick={loadCases}
                    disabled={casesLoading}
                  >
                    {casesLoading ? "Yuklanmoqda..." : "Yangilash"}
                  </button>
                </div>

                {casesError && <div className="errorBox">{casesError}</div>}

                {casesLoading ? (
                  <div className="emptyState">Kazuslar yuklanmoqda...</div>
                ) : filteredCases.length === 0 ? (
                  <div className="emptyState">
                    {search.trim()
                      ? "Qidiruv bo‘yicha material topilmadi."
                      : "Hozircha bu fan ichiga kazus yoki PDF joylanmagan."}
                  </div>
                ) : (
                  <div className="cases">
                    {filteredCases.map((item) => (
                      <article
                        className={`caseCard ${
                          item.type === "pdf" ? "pdfCaseCard" : ""
                        }`}
                        key={item.id}
                      >
                        <div className="subjectBadge">{selectedSubject.name}</div>

                        <h2>{item.title}</h2>

                        <div className="caseCardActions">
                          {!roleLoading && role === "admin" && (
                            <div className="caseAdminActions">
                              {item.type === "platform" && (
                                <button
                                  className="cardEditButton"
                                  type="button"
                                  onClick={() => openEditMode(item)}
                                >
                                  Tahrirlash
                                </button>
                              )}

                              <button
                                className="cardDeleteButton"
                                type="button"
                                disabled={deletingCaseId === item.id}
                                onClick={() => deleteCase(item)}
                              >
                                {deletingCaseId === item.id
                                  ? "O‘chirilmoqda..."
                                  : "O‘chirish"}
                              </button>
                            </div>
                          )}

                          <button
                            className="openButton"
                            type="button"
                            onClick={() => openCase(item)}
                          >
                            Ochish
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

      {mode === "write" && (
        <section className="editorBox">
          <div className="sectionTitle">
            {editingCaseId ? "Kazusni tahrirlash" : "Kazusga javob yozish"}
          </div>

          <div className="formGroup">
            <label>Fan nomi</label>

            <input
              type="text"
              value={subject}
              readOnly
              className="lockedSubjectInput"
            />
          </div>

          <div className="formGroup">
            <label>Kazus nomi</label>

            <input
              type="text"
              value={caseTitle}
              onChange={(e) => setCaseTitle(e.target.value)}
              placeholder="Masalan: 1-kazus"
            />
          </div>

          <div className="formGroup">
            <label>Kazus matni</label>

            <RichEditor
              value={caseText}
              onChange={setCaseText}
              placeholder="Kazusning to‘liq matnini shu yerga yozing..."
              minHeight={320}
              label="Kazus matni muharriri"
            />
          </div>

          <div className="questionsTitle">Savollar va javoblar</div>

          {questions.map((item, index) => (
            <div className="questionCard" key={item.id}>
              <div className="questionHeader">
                <div />

                {questions.length > 1 && (
                  <button
                    className="deleteButton"
                    type="button"
                    onClick={() => removeQuestion(item.id)}
                  >
                    O‘chirish
                  </button>
                )}
              </div>

              <div className="questionEditor3D">
                <div className="questionInlineRow">
                  <div className="questionNumberInline3D">
                    {index + 1}-savol
                  </div>

                  <div className="questionInlineEditorWrap">
                    <RichEditor
                      value={item.question}
                      onChange={(value) =>
                        changeQuestion(item.id, "question", value)
                      }
                      placeholder="Savol matnini yozing..."
                      minHeight={120}
                      label=""
                      paragraphMode="question"
                    />
                  </div>
                </div>
              </div>

              <label>Javob</label>

              <RichEditor
                value={item.answer}
                onChange={(value) =>
                  changeQuestion(item.id, "answer", value)
                }
                placeholder="Ushbu savolning javobini yozing..."
                minHeight={220}
                label="Javob muharriri"
              />
            </div>
          ))}

          <button
            className="addQuestionButton"
            type="button"
            onClick={addQuestion}
          >
            + Yana savol qo‘shish
          </button>

          {saveMessage && (
            <div
              className={
                saveMessage.startsWith("✅")
                  ? "successBox"
                  : "errorBox"
              }
            >
              {saveMessage}
            </div>
          )}

          <div className="bottomButtons">
            <button
              className="cancelButton"
              type="button"
              onClick={() => {
                resetForm();
                setMode("list");
              }}
              disabled={saving}
            >
              Bekor qilish
            </button>

            <button
              className="saveButton"
              type="button"
              onClick={saveCase}
              disabled={saving}
            >
              {saving
                ? editingCaseId
                  ? "Yangilanmoqda..."
                  : "Saqlanmoqda..."
                : editingCaseId
                  ? "O‘zgarishlarni saqlash"
                  : "Kazusni saqlash"}
            </button>
          </div>
        </section>
      )}

      {mode === "upload" && (
        <section className="editorBox">
          <div className="sectionTitle">Kazus yuklash</div>

          <div className="uploadArea">
            <div className="pdfIcon">PDF</div>

            <h2>PDF kazus yuklash</h2>

            <p>
              Bu bo‘limda Word dasturida tayyorlab, PDF formatiga
              o‘tkazilgan kazuslaringizni yuklaysiz.
            </p>

            <p className="comingSoon">
              Faqat PDF formatidagi, 10 MB gacha bo‘lgan fayl yuklang.
            </p>

            <div className="pdfMetaFields">
              <div className="pdfField">
                <label>Fan nomi</label>
                <input
                  type="text"
                  value={pdfSubject}
                  readOnly
                  className="lockedSubjectInput"
                  disabled={pdfUploading}
                />
              </div>

              <div className="pdfField">
                <label>Kazus nomi</label>
                <input
                  type="text"
                  value={pdfTitle}
                  onChange={(e) => {
                    setPdfTitle(e.target.value);
                    setPdfMessage("");
                  }}
                  placeholder="Masalan: 1-kazus"
                  disabled={pdfUploading}
                />
              </div>
            </div>

            <input
              className="fileInput"
              type="file"
              accept=".pdf,application/pdf"
              disabled={pdfUploading}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setPdfFile(file);
                setPdfMessage("");
              }}
            />

            {pdfFile && (
              <p>
                <strong>Tanlangan fayl:</strong> {pdfFile.name}
              </p>
            )}

            {pdfMessage && (
              <div
                className={
                  pdfMessage.startsWith("✅")
                    ? "successBox"
                    : "errorBox"
                }
              >
                {pdfMessage}
              </div>
            )}
          </div>

          <div className="bottomButtons">
            <button
              className="cancelButton"
              type="button"
              onClick={() => {
                setPdfFile(null);
                setPdfSubject("");
                setPdfTitle("");
                setPdfMessage("");
                setMode("list");
              }}
              disabled={pdfUploading}
            >
              Bekor qilish
            </button>

            <button
              className="saveButton"
              type="button"
              onClick={uploadPdf}
              disabled={
                pdfUploading ||
                !pdfFile ||
                !pdfSubject.trim() ||
                !pdfTitle.trim()
              }
            >
              {pdfUploading ? "PDF yuklanmoqda..." : "PDF yuklash"}
            </button>
          </div>
        </section>
      )}

      {mode === "view" && selectedCase && (
        <section className="viewerBox readingViewerBox">
          <div className="readingSectionTitle">Kazusni o‘qish</div>

          <div className="viewerHeader">
            <div>
              <div className="viewerSubject">{selectedCase.subject}</div>
              <h1>{selectedCase.title}</h1>
            </div>

            <div className="viewerHeaderActions">
              {!roleLoading && role === "admin" && (
                <button
                  className="adminEditButton"
                  type="button"
                  onClick={() => openEditMode(selectedCase)}
                >
                  Tahrirlash
                </button>
              )}

              <button
                className="smallBackButton"
                type="button"
                onClick={() => {
                  setSelectedCase(null);
                  setViewerMarkerMode("off");
                  setMode("list");
                }}
              >
                ← Ro‘yxatga
              </button>
            </div>
          </div>

          <div className="readerToolbar">
            <div className="readerToolGroup">
              <button
                className="readerToolButton"
                type="button"
                onClick={() => changeViewerZoom(-10)}
                disabled={viewerZoom <= 70}
              >
                −
              </button>

              <div className="readerZoomValue">{viewerZoom}%</div>

              <button
                className="readerToolButton"
                type="button"
                onClick={() => changeViewerZoom(10)}
                disabled={viewerZoom >= 200}
              >
                +
              </button>
            </div>

            <div className="readerToolGroup">
              <button
                className={
                  viewerMarkerMode === "mark"
                    ? "readerModeButton active"
                    : "readerModeButton"
                }
                type="button"
                onClick={() =>
                  setViewerMarkerMode((old) =>
                    old === "mark" ? "off" : "mark"
                  )
                }
              >
                🖍 Marker
              </button>

              <label className="readerColorControl">
                <span>Rang</span>
                <input
                  type="color"
                  value={viewerMarkerColor}
                  onChange={(e) => setViewerMarkerColor(e.target.value)}
                />
              </label>

              <button
                className={
                  viewerMarkerMode === "erase"
                    ? "readerModeButton active erase"
                    : "readerModeButton erase"
                }
                type="button"
                onClick={() =>
                  setViewerMarkerMode((old) =>
                    old === "erase" ? "off" : "erase"
                  )
                }
              >
                O‘chirg‘ich
              </button>
            </div>

            <div className="readerModeStatus">
              {viewerMarkerMode === "mark"
                ? "Marker rejimi"
                : viewerMarkerMode === "erase"
                  ? "O‘chirish rejimi"
                  : "Faqat o‘qish rejimi"}
            </div>
          </div>

          <div
            className="readerViewport"
            onMouseUp={(event) => {
              if (viewerMarkerMode === "mark") {
                applyViewerHighlight();
              } else if (viewerMarkerMode === "erase") {
                eraseViewerHighlight(event.target);
              }
            }}
            onClick={(event) => {
              if (viewerMarkerMode === "erase") {
                eraseViewerHighlight(event.target);
              }
            }}
          >
            <div
              ref={viewerContentRef}
              className="readerPaper"
              style={{
                transform: `scale(${viewerZoom / 100})`,
                transformOrigin: "top center",
                width: `${10000 / viewerZoom}%`,
              }}
            >
              <div className="caseTextBox readerCaseTextBox">
                <h2>Kazus matni</h2>
                <div
                  className="richViewerContent"
                  dangerouslySetInnerHTML={{ __html: selectedCase.caseText }}
                />
              </div>

              <div className="viewerQuestionsTitle">Savollar va javoblar</div>

              <div className="viewerQuestions">
                {selectedCase.questions.map((item, index) => (
                  <div className="viewerQuestionCard" key={item.id}>
                    <div className="viewerQuestion">
                      <div className="viewerQuestion3D">
                        <div className="questionFlow">
                          <span className="questionNumberInline3D">
                            {index + 1}-savol
                          </span>

                          <span
                            className="richViewerContent inlineQuestionContent"
                            dangerouslySetInnerHTML={{ __html: item.question }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="viewerAnswer">
                      <div className="answerLabel">Javob</div>
                      <div
                        className="richViewerContent"
                        dangerouslySetInnerHTML={{ __html: item.answer }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 20px;
          background: linear-gradient(180deg, #ffffff 0%, #f2f4f5 100%);
          font-family: "Bell MT", "Times New Roman", serif;
          color: #111;
        }

        .topPanel {
          width: 100%;
          min-height: 120px;
          padding: 25px 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          border: 3px solid #173e58;
          border-radius: 27px;
          background: linear-gradient(
            180deg,
            #8bd3ff 0%,
            #69b7e8 45%,
            #4999ce 100%
          );
          box-shadow:
            inset 0 6px 6px rgba(255, 255, 255, 0.75),
            inset 0 -7px 7px rgba(0, 0, 0, 0.18),
            0 7px 0 #173c55,
            0 12px 18px rgba(0, 0, 0, 0.22);
        }

        .titlePlate {
          min-width: 430px;
          padding: 18px 28px;
          text-align: center;
          font-size: 29px;
          font-weight: 700;
          border: 3px solid #42494e;
          border-radius: 16px;
          background: linear-gradient(
            180deg,
            #f7f7f7 0%,
            #dedede 30%,
            #b9b9b9 70%,
            #9f9f9f 100%
          );
          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.95),
            inset 0 -6px 6px rgba(0, 0, 0, 0.2),
            0 5px 0 #4b5256,
            0 9px 11px rgba(0, 0, 0, 0.23);
        }

        .backButton,
        .smallBackButton {
          border: 3px solid #464c50;
          border-radius: 14px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
          background: linear-gradient(
            180deg,
            #f8f8f8,
            #dedede 30%,
            #b8b8b8 70%,
            #999
          );
          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.95),
            inset 0 -6px 6px rgba(0, 0, 0, 0.2),
            0 5px 0 #4b5256;
        }

        .backButton {
          width: 150px;
          height: 58px;
          font-size: 17px;
        }

        .smallBackButton {
          min-width: 150px;
          min-height: 50px;
          padding: 10px 18px;
          font-size: 16px;
        }

        .controlBox {
          width: min(1500px, 97%);
          margin: 65px auto 0;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 20px;
        }

        .mainActionButton {
          min-height: 76px;
          border: 3px solid #174461;
          border-radius: 17px;
          cursor: pointer;
          font-family: inherit;
          font-size: 19px;
          font-weight: 700;
          color: #073b68;
          background: linear-gradient(
            180deg,
            #a8e1ff,
            #72bfea 48%,
            #4797ca
          );
          box-shadow:
            inset 0 6px 6px rgba(255, 255, 255, 0.8),
            inset 0 -6px 6px rgba(0, 0, 0, 0.18),
            0 6px 0 #17415c,
            0 11px 15px rgba(0, 0, 0, 0.23);
        }

        .mainActionButton:hover {
          filter: brightness(1.07);
          transform: translateY(-1px);
        }

        .mainBox,
        .editorBox,
        .viewerBox {
          position: relative;
          width: min(1400px, 95%);
          margin: 80px auto 40px;
          padding: 75px 35px 50px;
          border: 3px solid #303538;
          border-radius: 28px;
          background: linear-gradient(
            145deg,
            #686c6f,
            #505457 45%,
            #363a3d
          );
          box-shadow:
            inset 0 7px 6px rgba(255, 255, 255, 0.23),
            inset 0 -8px 8px rgba(0, 0, 0, 0.32),
            0 7px 0 #272b2e,
            0 15px 24px rgba(0, 0, 0, 0.3);
        }

        .sectionTitle {
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 310px;
          min-height: 66px;
          padding: 12px 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          font-size: 28px;
          font-weight: 700;
          color: #073b68;
          border: 3px solid #174461;
          border-radius: 15px;
          background: linear-gradient(
            180deg,
            #9bd9ff,
            #73bdea 45%,
            #4e9ccc
          );
          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.75),
            inset 0 -6px 6px rgba(0, 0, 0, 0.16),
            0 5px 0 #17415c,
            0 9px 13px rgba(0, 0, 0, 0.25);
        }

        .searchRow {
          max-width: 1000px;
          margin: 0 auto 35px;
          display: grid;
          grid-template-columns: 1fr 180px;
          gap: 15px;
        }

        .searchInput {
          min-height: 54px;
          padding: 0 18px;
          border: 2px solid #454c50;
          border-radius: 11px;
          outline: none;
          font-family: inherit;
          font-size: 17px;
          background: #f5f5f5;
        }

        .refreshButton {
          min-height: 54px;
          border: 2px solid #174461;
          border-radius: 11px;
          cursor: pointer;
          font-family: inherit;
          font-size: 16px;
          font-weight: 700;
          color: #073b68;
          background: linear-gradient(#a4deff, #54a8db);
          box-shadow: 0 4px 0 #17415c;
        }

        .cases {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 30px;
        }

        .caseCard {
          min-height: 235px;
          padding: 30px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          text-align: center;
          border: 1px solid #8a8f93;
          border-radius: 20px;
          background: linear-gradient(
            180deg,
            #f6f6f6 0%,
            #e2e2e2 55%,
            #c8c8c8 100%
          );
          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.92),
            inset 0 -4px 5px rgba(0, 0, 0, 0.08),
            0 5px 0 #6b7276,
            0 10px 17px rgba(0, 0, 0, 0.19);
        }

        .caseCard h2 {
          margin: 0;
          font-size: 25px;
          line-height: 1.25;
          color: #111;
        }

        .caseType,
        .subjectBadge,
        .questionCount {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 700;
        }

        .caseType {
          background: #eaf6ff;
          color: #174461;
        }

        .pdfCaseCard {
          border-color: #8a8f93;
        }

        .pdfCaseType {
          background: #f9dddd;
          color: #8a1e1e;
        }

        .pdfCardIcon {
          width: 64px;
          height: 64px;
          margin: 12px auto 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #c92727;
          color: white;
          font-size: 17px;
          font-weight: 700;
          box-shadow: 0 4px 0 #771515;
        }

        .pdfFileName {
          word-break: break-word;
          font-weight: 700;
        }

        .pdfInfo {
          background: #f1dede;
          color: #6e2525;
        }

        .subjectBadge {
          margin: 0;
          padding: 8px 17px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #073b68;
          font-size: 14px;
          font-weight: 700;
          border: 2px solid #174461;
          border-radius: 999px;
          background: linear-gradient(
            180deg,
            #d8f2ff 0%,
            #9bd7f5 45%,
            #5ba9d6 100%
          );
          box-shadow:
            inset 0 3px 3px rgba(255,255,255,.95),
            inset 0 -2px 3px rgba(0,0,0,.13),
            0 4px 0 #17415c,
            0 7px 10px rgba(0,0,0,.18);
          text-shadow: 0 1px 0 rgba(255,255,255,.9);
        }

        .questionCount {
          margin: 12px 0 18px;
          background: #d9dedf;
          color: #29353c;
        }

        .casePreview {
          width: 100%;
          min-height: 58px;
          margin: 4px 0 0;
          color: #27363e;
          line-height: 1.45;
          font-size: 15px;
        }

        .caseCardActions {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }

        .caseAdminActions {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .cardEditButton,
        .cardDeleteButton {
          min-width: 92px;
          height: 34px;
          padding: 0 11px;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          box-shadow:
            inset 0 2px 2px rgba(255,255,255,.78),
            0 3px 0 rgba(0,0,0,.25);
        }

        .cardEditButton {
          color: #073b68;
          border: 2px solid #174461;
          background: linear-gradient(#c8edff,#62b3df);
        }

        .cardDeleteButton {
          color: #000;
          border: 2px solid #a22626;
          background: linear-gradient(#ffd8d8,#ef8585);
        }

        .cardDeleteButton:disabled {
          opacity: .55;
          cursor: wait;
        }

        .caseCardActions .openButton {
          width: 100%;
          max-width: 230px;
          margin: 0 auto;
        }

        .openButton {
          width: 175px;
          height: 50px;
          border: 2px solid #4e565b;
          border-radius: 9px;
          cursor: pointer;
          font-family: inherit;
          font-size: 17px;
          font-weight: 700;
          background: linear-gradient(180deg, #f8f8f8, #bdbdbd);
          box-shadow:
            inset 0 4px 4px white,
            0 4px 0 #555d61;
        }

        .formGroup {
          width: 100%;
          max-width: 1050px;
          margin: 0 auto 28px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        label {
          color: white;
          font-size: 20px;
          font-weight: 700;
        }

        .formGroup input,
        textarea {
          width: 100%;
          padding: 15px;
          border: 3px solid #525a5f;
          border-radius: 12px;
          outline: none;
          font-family: inherit;
          font-size: 18px;
          background: #f5f5f5;
          box-shadow:
            inset 0 3px 6px rgba(0, 0, 0, 0.15),
            0 3px 0 #343a3e;
        }

        .formGroup input:focus,
        textarea:focus {
          border-color: #5cb6eb;
        }

        .caseTextarea {
          min-height: 260px;
          resize: vertical;
        }

        .questionsTitle,
        .viewerQuestionsTitle {
          max-width: 1050px;
          margin: 45px auto 25px;
          padding: 15px;
          text-align: center;
          border-radius: 12px;
          font-size: 25px;
          font-weight: 700;
          color: #073b68;
          background: linear-gradient(180deg, #9bd9ff, #57a8da);
        }

        .questionCard {
          max-width: 1050px;
          margin: 0 auto 35px;
          padding: 28px;
          border: 3px solid #454c50;
          border-radius: 18px;
          background: linear-gradient(145deg, #dedede, #b5b5b5);
          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.8),
            0 6px 0 #303538;
        }

        .questionCard label {
          display: block;
          margin: 15px 0 8px;
          color: #152b3a;
        }

        .questionHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .questionHeader h3 {
          margin: 0;
          color: #073b68;
          font-size: 24px;
        }

        .questionEditor3D {
          margin-top: 4px;
          padding: 24px 26px;
          border: 2px solid #62686c;
          border-radius: 15px;
          background: linear-gradient(145deg, #ffffff, #e3e3e3);
          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.92),
            inset 0 -4px 5px rgba(0,0,0,.08),
            0 5px 0 #666d71,
            0 10px 16px rgba(0,0,0,.18);
        }

        .questionInlineRow {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          width: 100%;
        }

        .questionNumberInline3D {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 76px;
          padding: 5px 9px;
          margin: 0 8px 2px 0;
          vertical-align: middle;
          color: #073b68;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          border: 2px solid #174461;
          border-radius: 8px;
          background: linear-gradient(
            180deg,
            #c6edff 0%,
            #82c9ef 48%,
            #4f9fcf 100%
          );
          box-shadow:
            inset 0 3px 3px rgba(255,255,255,.92),
            inset 0 -2px 3px rgba(0,0,0,.14),
            0 4px 0 #17415c,
            0 7px 10px rgba(0,0,0,.20);
          text-shadow: 0 1px 0 rgba(255,255,255,.82);
        }

        .questionInlineEditorWrap {
          flex: 1 1 auto;
          min-width: 0;
        }

        .questionInlineEditorWrap :global(.richEditorShell) {
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }

        .questionInlineEditorWrap :global(.richToolbar) {
          margin-bottom: 12px;
          border-radius: 10px;
        }

        .questionInlineEditorWrap :global(.richEditor) {
          min-height: 110px !important;
          padding: 0;
          background: transparent;
          font-size: 20px;
          line-height: 1.7;
          text-align: justify;
        }

        .questionInlineEditorWrap :global(.richEditorHint) {
          display: none;
        }

        .questionTextarea {
          min-height: 110px;
          resize: vertical;
        }

        .answerTextarea {
          min-height: 210px;
          resize: vertical;
        }

        .deleteButton {
          padding: 9px 17px;
          border: 2px solid #8b1818;
          border-radius: 8px;
          cursor: pointer;
          color: white;
          font-family: inherit;
          font-weight: 700;
          background: linear-gradient(#ef5b5b, #a91616);
        }

        .addQuestionButton {
          display: block;
          width: 250px;
          min-height: 55px;
          margin: 20px auto 45px;
          border: 3px solid #174461;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 18px;
          font-weight: 700;
          color: #073b68;
          background: linear-gradient(#a4deff, #54a8db);
          box-shadow:
            inset 0 4px 4px white,
            0 5px 0 #17415c;
        }

        .uploadArea {
          max-width: 850px;
          margin: 20px auto 40px;
          padding: 60px 30px;
          text-align: center;
          border: 3px dashed #5caedc;
          border-radius: 20px;
          background: linear-gradient(145deg, #eeeeee, #bdbdbd);
        }

        .pdfIcon {
          width: 90px;
          height: 90px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: #c92727;
          color: white;
          font-size: 24px;
          font-weight: 700;
          box-shadow: 0 6px 0 #771515;
        }

        .uploadArea p {
          font-size: 18px;
          line-height: 1.5;
        }

        .comingSoon {
          color: #7a1717;
          font-weight: 700;
        }

        .pdfMetaFields {
          max-width: 650px;
          margin: 28px auto 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          text-align: left;
        }

        .pdfField {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pdfField label {
          color: #173e58;
          font-size: 18px;
          font-weight: 700;
        }

        .pdfField input {
          width: 100%;
          min-height: 50px;
          padding: 10px 14px;
          border: 2px solid #525a5f;
          border-radius: 10px;
          outline: none;
          font-family: inherit;
          font-size: 17px;
          background: #ffffff;
          box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.12);
        }

        .pdfField input:focus {
          border-color: #5cb6eb;
        }

        .fileInput {
          max-width: 600px;
          margin-top: 25px;
          background: white;
        }

        .bottomButtons {
          max-width: 700px;
          margin: 40px auto 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        .cancelButton,
        .saveButton {
          min-height: 58px;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 18px;
          font-weight: 700;
        }

        .cancelButton {
          border: 3px solid #565d61;
          background: linear-gradient(#f4f4f4, #a7a7a7);
          box-shadow: 0 5px 0 #4d5357;
        }

        .saveButton {
          border: 3px solid #174461;
          color: #073b68;
          background: linear-gradient(#9edcff, #4c9fd1);
          box-shadow: 0 5px 0 #17415c;
        }

        .saveButton:disabled,
        .cancelButton:disabled,
        .refreshButton:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .successBox,
        .errorBox,
        .emptyState {
          max-width: 1050px;
          margin: 20px auto;
          padding: 18px 22px;
          border-radius: 12px;
          text-align: center;
          font-size: 17px;
          font-weight: 700;
        }

        .successBox {
          color: #165f31;
          border: 2px solid #2f8650;
          background: #dff4e5;
        }

        .errorBox {
          color: #8a1e1e;
          border: 2px solid #a63a3a;
          background: #f9dddd;
        }

        .emptyState {
          color: #24343d;
          border: 2px solid #69747a;
          background: #d8dcde;
        }

        .protectedReaderPage .readerPaper,
        .protectedReaderPage .viewerHeader {
          -webkit-user-drag: none;
        }

        .readingViewerBox {
          padding: 34px 20px 40px;
          overflow-x: hidden;
        }

        .readingSectionTitle {
          position: static;
          width: fit-content;
          min-width: 260px;
          margin: 0 auto 34px;
          padding: 12px 28px;
          text-align: center;
          color: #073b68;
          font-size: 24px;
          font-weight: 700;
          border: 2px solid #174461;
          border-radius: 12px;
          background: linear-gradient(
            180deg,
            #c8edff 0%,
            #8bcff0 46%,
            #50a0cf 100%
          );
          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.92),
            inset 0 -3px 4px rgba(0,0,0,.12),
            0 5px 0 #17415c,
            0 9px 14px rgba(0,0,0,.22);
          text-shadow: 0 1px 0 rgba(255,255,255,.85);
        }

        .readerToolbar {
          position: sticky;
          top: 10px;
          z-index: 60;
          width: min(1240px, 100%);
          max-width: 1240px;
          margin: 0 auto 24px;
          padding: 13px 16px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          border: 2px solid #565d61;
          border-radius: 14px;
          background: linear-gradient(#f8f8f8, #c7c7c7);
          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.9),
            0 5px 0 #3f464a,
            0 9px 14px rgba(0,0,0,.2);
        }

        .readerToolGroup {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .readerToolButton,
        .readerModeButton {
          min-height: 40px;
          padding: 7px 12px;
          border: 2px solid #4f575c;
          border-radius: 9px;
          cursor: pointer;
          font-family: inherit;
          font-size: 16px;
          font-weight: 700;
          background: linear-gradient(#ffffff, #c8c8c8);
          box-shadow: 0 3px 0 #575e62;
        }

        .readerToolButton {
          min-width: 46px;
          font-size: 22px;
        }

        .readerToolButton:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .readerZoomValue {
          min-width: 68px;
          text-align: center;
          color: #073b68;
          font-size: 17px;
          font-weight: 700;
        }

        .readerModeButton.active {
          border-color: #806c00;
          background: linear-gradient(#fff79a, #e5c900);
          box-shadow: 0 3px 0 #8d7a00;
        }

        .readerModeButton.erase.active {
          color: #842020;
          border-color: #8d3131;
          background: linear-gradient(#ffdede, #e79b9b);
          box-shadow: 0 3px 0 #8b3939;
        }

        .readerColorControl {
          min-height: 42px;
          padding: 6px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #173e58;
          border: 2px solid #4f575c;
          border-radius: 9px;
          background: #f5f5f5;
        }

        .readerColorControl input {
          width: 34px;
          height: 28px;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .readerModeStatus {
          margin-left: auto;
          padding: 8px 14px;
          border-radius: 999px;
          color: #073b68;
          font-size: 14px;
          font-weight: 700;
          background: #dceffd;
        }

        .readerViewport {
          width: min(1240px, 100%);
          max-width: 1240px;
          min-height: 700px;
          margin: 0 auto;
          padding: 18px 10px 50px;
          overflow: auto;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow:
            inset 0 7px 10px rgba(0,0,0,.45),
            0 8px 16px rgba(0,0,0,.24);
        }

        .readerPaper {
          max-width: 100%;
          margin: 0 auto;
          padding: 42px;
          border-radius: 4px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(0,0,0,.3);
          transition: transform .18s ease;
        }

        .readerCaseTextBox {
          max-width: none;
          margin-top: 0;
          border: 0;
          border-radius: 0;
          background: #fff;
          box-shadow: none;
        }

        .viewerHeader {
          max-width: 1240px;
          margin: 0 auto 30px;
          padding: 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-radius: 17px;
          background: linear-gradient(145deg, #dfdfdf, #b9b9b9);
          border: 2px solid #41484c;
          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.8),
            0 5px 0 #373d41;
        }

        .viewerHeader h1 {
          margin: 8px 0 0;
          font-size: 32px;
          color: #111;
        }

        .viewerHeaderActions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 0 0 auto;
        }

        .adminEditButton {
          min-width: 130px;
          min-height: 50px;
          padding: 10px 18px;
          border: 3px solid #174461;
          border-radius: 14px;
          cursor: pointer;
          font-family: inherit;
          font-size: 16px;
          font-weight: 700;
          color: #073b68;
          background: linear-gradient(
            180deg,
            #b9e7ff,
            #77c3ec 52%,
            #4a99ca
          );
          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.85),
            0 5px 0 #17415c;
        }

        .viewerSubject {
          display: inline-block;
          padding: 7px 14px;
          border-radius: 18px;
          background: #9edcff;
          color: #073b68;
          font-weight: 700;
        }

        .caseTextBox {
          max-width: 1160px;
          margin: 0 auto;
          padding: 30px;
          border: 2px solid #434b50;
          border-radius: 18px;
          background: #f0f0f0;
          box-shadow:
            inset 0 4px 5px rgba(255, 255, 255, 0.9),
            0 5px 0 #3c4347;
        }

        .caseTextBox h2 {
          margin: 0 0 18px;
          color: #073b68;
        }

        .caseTextBox p {
          margin: 0;
          white-space: pre-wrap;
          line-height: 1.75;
          font-size: 18px;
        }

        .richViewerContent {
          white-space: normal;
          line-height: 1.62;
          font-size: 20px;
          text-align: left;
          overflow-wrap: break-word;
          word-break: normal;
          letter-spacing: normal;
          word-spacing: normal;
        }

        .richViewerContent :global(table) {
          max-width: 100%;
        }

        .richViewerContent :global(p) {
          margin: 0 0 12px;
          text-align: inherit;
        }

        .richViewerContent :global(div) {
          text-align: inherit;
        }

        .inlineRich {
          display: inline;
        }

        .inlineRich :global(p) {
          display: inline;
          margin: 0;
          text-indent: 0;
        }

        .viewerQuestions {
          max-width: 1100px;
          margin: 0 auto;
        }

        .viewerQuestionCard {
          margin-bottom: 28px;
          padding: 25px;
          border-radius: 17px;
          border: 2px solid #434b50;
          background: linear-gradient(145deg, #dedede, #b8b8b8);
          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.75),
            0 5px 0 #363d41;
        }

        .viewerQuestion {
          padding: 0;
          border-radius: 14px;
          background: transparent;
          font-size: 19px;
          line-height: 1.6;
        }

        .viewerQuestion3D {
          padding: 10px 13px;
          border: 2px solid #62686c;
          border-radius: 15px;
          background: linear-gradient(
            145deg,
            #f6f6f6 0%,
            #dddddd 62%,
            #c8c8c8 100%
          );
          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.95),
            inset 0 -4px 5px rgba(0,0,0,.08),
            0 5px 0 #666d71,
            0 10px 16px rgba(0,0,0,.18);
        }

        .questionFlow {
          display: block;
          width: 100%;
          color: #111;
          font-size: 19px;
          font-weight: 700;
          line-height: 1.48;
          text-align: left;
          letter-spacing: normal;
          word-spacing: normal;
        }

        .inlineQuestionContent {
          display: inline;
          color: #111;
          font-size: 19px;
          font-weight: 700;
          line-height: 1.48;
          text-align: left;
          letter-spacing: normal;
          word-spacing: normal;
        }

        .inlineQuestionContent :global(p),
        .inlineQuestionContent :global(div) {
          display: inline;
          margin: 0;
          text-indent: 0;
          text-align: left;
          letter-spacing: normal;
          word-spacing: normal;
        }

        .inlineQuestionContent :global(p + p),
        .inlineQuestionContent :global(div + div) {
          display: block;
          margin-top: 12px;
          text-indent: 2em;
        }

        .viewerAnswer {
          margin-top: 18px;
          padding: 20px;
          border-radius: 11px;
          background: #dceffd;
          font-size: 18px;
          line-height: 1.7;
        }

        .viewerAnswer p {
          margin: 7px 0 0;
          white-space: pre-wrap;
        }

        .answerLabel {
          color: #073b68;
          font-weight: 700;
        }

        button:active {
          transform: translateY(3px);
          box-shadow: none;
        }

        @media (max-width: 950px) {
          .page {
            padding: 10px;
          }

          .topPanel {
            flex-direction: column;
            padding: 20px;
          }

          .titlePlate {
            min-width: 0;
            width: 100%;
            font-size: 22px;
          }

          .backButton {
            width: 100%;
          }

          .controlBox {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .cases {
            grid-template-columns: 1fr;
          }

          .mainBox,
          .editorBox,
          .viewerBox {
            width: 100%;
            padding: 70px 15px 30px;
          }

          .sectionTitle {
            min-width: 240px;
            max-width: 92%;
            white-space: normal;
            text-align: center;
            font-size: 21px;
          }

          .searchRow {
            grid-template-columns: 1fr;
          }

          .bottomButtons {
            grid-template-columns: 1fr;
          }

          .pdfMetaFields {
            grid-template-columns: 1fr;
          }

          .questionCard {
            padding: 18px;
          }

          .questionInlineRow {
            gap: 12px;
          }

          .questionNumberInline3D {
            min-width: 90px;
            padding: 7px 11px;
            margin-right: 10px;
            font-size: 15px;
          }

          .viewerQuestion3D,
          .questionEditor3D {
            padding: 16px;
          }

          .readingSectionTitle {
            min-width: 210px;
            margin-bottom: 24px;
            font-size: 20px;
          }

          .questionFlow,
          .inlineQuestionContent {
            font-size: 18px;
          }

          .viewerHeader {
            flex-direction: column;
            align-items: stretch;
          }

          .smallBackButton {
            width: 100%;
          }
        }

        @media (max-width: 620px) {
          .controlBox {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .page {
            width: 100%;
            overflow-x: hidden;
          }

          .topPanel {
            width: calc(100% - 20px);
            margin: 12px auto 0;
            padding: 14px;
            gap: 12px;
            border-radius: 20px;
          }

          .titlePlate {
            min-width: 0;
            width: 100%;
            padding: 14px 12px;
            font-size: clamp(20px, 6vw, 27px);
          }

          .backButton {
            width: 100%;
            height: 52px;
          }

          .topPanel {
            flex-direction: column;
            align-items: stretch;
          }

          .controlBox {
            width: calc(100% - 24px);
            margin-top: 36px;
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .mainActionButton {
            width: 100%;
            min-height: 58px;
            padding: 10px 12px;
            font-size: clamp(15px, 4.5vw, 18px);
            border-radius: 14px;
          }

          .mainBox,
          .editorBox,
          .viewerBox {
            width: calc(100% - 16px);
            margin: 58px auto 24px;
            padding: 54px 8px 24px;
            border-radius: 18px;
          }

          .readingViewerBox {
            padding: 22px 8px 24px;
          }

          .readingSectionTitle {
            min-width: 0;
            width: min(230px, 78%);
            margin-bottom: 20px;
            padding: 9px 16px;
            font-size: 19px;
          }

          .viewerHeader {
            width: 100%;
            margin-bottom: 18px;
            padding: 16px;
            gap: 14px;
          }

          .viewerHeader h1 {
            font-size: clamp(22px, 7vw, 28px);
          }

          .viewerHeaderActions {
            width: 100%;
            flex-direction: column;
          }

          .viewerHeaderActions button {
            width: 100%;
          }

          .readerToolbar {
            position: static;
            width: 100%;
            padding: 10px;
            gap: 9px;
          }

          .readerToolGroup {
            width: 100%;
            justify-content: center;
            flex-wrap: wrap;
          }

          .readerModeStatus {
            width: 100%;
            margin-left: 0;
            text-align: center;
          }

          .readerViewport {
            width: 100%;
            min-height: 500px;
            padding: 12px 5px 40px;
            border-radius: 14px;
          }

          .readerPaper {
            width: 100% !important;
            max-width: 100%;
            padding: 16px 10px;
            transform-origin: top center;
          }

          .caseTextBox {
            padding: 14px 10px;
          }

          .richViewerContent {
            font-size: 16px;
            line-height: 1.55;
          }

          .viewerQuestion3D {
            padding: 10px 10px;
            border-radius: 12px;
          }

          .questionNumberInline3D {
            min-width: 72px;
            padding: 5px 8px;
            margin-right: 7px;
            font-size: 12px;
          }

          .questionFlow,
          .inlineQuestionContent {
            font-size: 16px;
            line-height: 1.42;
            word-spacing: normal;
            letter-spacing: normal;
          }

          .viewerAnswer {
            padding: 14px 10px;
          }

          .formGroup,
          .questionsBox {
            width: 100%;
          }

          .richEditorShell {
            max-width: 100%;
          }

          .richToolbar {
            overflow-x: auto;
          }

          .toolGroup {
            min-width: 620px;
          }
        }

        @media (max-width: 520px) {
          .mainActionButton {
            min-height: 62px;
            font-size: 17px;
          }

          .controlBox {
            grid-template-columns: 1fr;
          }

          .readerToolbar {
            align-items: stretch;
          }

          .readerModeStatus {
            width: 100%;
            margin-left: 0;
            text-align: center;
          }

          .readerViewport {
            padding: 18px 8px 55px;
          }

          .readerPaper {
            padding: 24px 18px;
          }

          .caseCard {
            min-height: 250px;
            padding: 20px;
          }

          .caseCard h2 {
            font-size: 24px;
          }

          .questionHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .deleteButton {
            width: 100%;
          }

          .addQuestionButton {
            width: 100%;
          }

          .viewerHeader h1 {
            font-size: 27px;
          }

          .caseTextBox {
            padding: 20px;
          }

          .caseTextBox p,
          .viewerQuestion,
          .viewerAnswer {
            font-size: 16px;
          }
        }
        /* =====================================================
           KURS → SEMESTR → FAN → KAZUSLAR
        ===================================================== */
        .examLinksOnly {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          max-width: 1320px;
        }

        .hierarchyBox {
          min-height: 500px;
        }

        .breadcrumbRow {
          width: min(1180px, 100%);
          margin: 0 auto 28px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          border: 1px solid #aab2b7;
          border-radius: 14px;
          background: linear-gradient(180deg,#fbfbfb 0%,#e7e7e7 100%);
          box-shadow:
            inset 0 3px 3px rgba(255,255,255,.92),
            0 4px 0 #676e72,
            0 8px 13px rgba(0,0,0,.12);
        }

        .breadcrumbRow > span:not(.crumb) {
          color: #49748e;
          font-size: 18px;
          font-weight: 700;
          line-height: 1;
        }

        .crumb {
          min-height: 34px;
          padding: 6px 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid transparent;
          border-radius: 999px;
          cursor: pointer;
          font-family: inherit;
          color: #164d70;
          background: transparent;
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
        }

        button.crumb:hover {
          border-color: #8abfdc;
          background: #e8f6ff;
          color: #073b68;
        }

        .crumb.active {
          color: #073b68;
          border-color: #99cce7;
          background: linear-gradient(180deg,#e5f7ff,#c8eaff);
          box-shadow:
            inset 0 2px 2px rgba(255,255,255,.9),
            0 2px 0 #88aebe;
        }

        .courseGrid,
        .semesterGrid,
        .subjectsGrid {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          gap: 22px;
        }

        .courseGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .semesterGrid {
          max-width: 760px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .hierarchyCard {
          min-height: 180px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          font-family: inherit;
          border: 2px solid #174461;
          border-radius: 18px;
          color: #073b68;
          background: linear-gradient(180deg,#c9efff,#79c5ed 52%,#4b9ccc);
          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.85),
            inset 0 -5px 5px rgba(0,0,0,.12),
            0 6px 0 #17415c,
            0 11px 17px rgba(0,0,0,.19);
        }

        .hierarchyCard:hover {
          transform: translateY(-2px);
          filter: brightness(1.04);
        }

        .hierarchyBig {
          font-size: 28px;
          font-weight: 700;
        }

        .hierarchySmall {
          font-size: 15px;
          opacity: .82;
        }

        .subjectAdminBar,
        .subjectMaterialActions {
          max-width: 1180px;
          margin: 0 auto 22px;
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 14px;
        }

        .addSubjectButton {
          min-height: 54px;
          border: 2px solid #174461;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 17px;
          font-weight: 700;
          color: #073b68;
          background: linear-gradient(#c9efff,#68b9e4);
          box-shadow: 0 4px 0 #17415c;
        }

        .subjectForm3D {
          max-width: 760px;
          margin: 0 auto 24px;
          padding: 20px;
          border: 2px solid #555d62;
          border-radius: 15px;
          background: linear-gradient(#f8f8f8,#d9d9d9);
          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.85),
            0 5px 0 #5d6468,
            0 9px 14px rgba(0,0,0,.15);
        }

        .subjectForm3D label {
          display: block;
          color: #173e58;
          font-weight: 700;
        }

        .subjectForm3D input {
          width: 100%;
          margin-top: 7px;
          padding: 12px 13px;
          border: 2px solid #697176;
          border-radius: 9px;
          font-family: inherit;
          font-size: 17px;
        }

        .subjectFormActions {
          margin-top: 13px;
          display: flex;
          gap: 10px;
        }

        .saveSubjectButton,
        .cancelSubjectButton {
          flex: 1 1 0;
          min-height: 44px;
          border-radius: 9px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
        }

        .saveSubjectButton {
          color: #073b68;
          border: 2px solid #174461;
          background: #9edcff;
        }

        .cancelSubjectButton {
          border: 2px solid #666;
          background: #e7e7e7;
        }

        .subjectMessage {
          margin-top: 12px;
          font-weight: 700;
        }

        .subjectsGrid {
          grid-template-columns: repeat(3,minmax(0,1fr));
        }

        .subjectFolderCard {
          position: relative;
          min-height: 185px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid #8a9398;
          border-radius: 17px;
          background: linear-gradient(#f8f8f8,#dedede);
          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.9),
            0 5px 0 #6b7276,
            0 9px 14px rgba(0,0,0,.14);
        }

        .subjectFolderOpen {
          flex: 1 1 auto;
          border: 0;
          cursor: pointer;
          background: transparent;
          font-family: inherit;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }

        .folderName3D {
          max-width: 100%;
          padding: 8px 14px;
          color: #073b68;
          font-size: 18px;
          font-weight: 700;
          text-align: center;
          border: 2px solid #174461;
          border-radius: 999px;
          background: linear-gradient(#d7f2ff,#76c2eb);
          box-shadow:
            inset 0 3px 3px rgba(255,255,255,.9),
            0 4px 0 #17415c;
        }

        .materialCount {
          font-size: 14px;
          color: #5c666c;
          font-weight: 700;
        }

        .subjectFolderAdmin {
          display: flex;
          gap: 8px;
        }

        .miniEditButton,
        .miniDeleteButton {
          flex: 1 1 0;
          min-height: 32px;
          border-radius: 7px;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
        }

        .miniEditButton {
          color: #073b68;
          border: 1.5px solid #174461;
          background: #b9e6ff;
        }

        .miniDeleteButton {
          color: #000;
          border: 1.5px solid #9a2424;
          background: #f08c8c;
        }

        .lockedSubjectInput {
          background: #e8eef2 !important;
          color: #173e58 !important;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .courseGrid {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }

          .subjectsGrid {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
        }

        @media (max-width: 600px) {
          .examLinksOnly {
            grid-template-columns: 1fr;
            width: calc(100% - 18px);
          }

          .hierarchyBox {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .breadcrumbRow {
            margin-bottom: 14px;
            padding: 7px;
            gap: 4px;
            border-radius: 10px;
            overflow-x: auto;
            flex-wrap: nowrap;
            scrollbar-width: none;
          }

          .breadcrumbRow::-webkit-scrollbar {
            display: none;
          }

          .breadcrumbRow > span:not(.crumb) {
            font-size: 13px;
          }

          .crumb {
            flex: 0 0 auto;
            min-height: 28px;
            padding: 4px 8px;
            font-size: 10.5px;
          }

          .courseGrid {
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 10px;
          }

          .semesterGrid,
          .subjectsGrid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .hierarchyCard {
            min-height: 112px;
            padding: 12px 8px;
            border-radius: 12px;
            box-shadow:
              inset 0 3px 3px rgba(255,255,255,.8),
              0 4px 0 #17415c;
          }

          .hierarchyBig {
            font-size: 19px;
          }

          .hierarchySmall {
            font-size: 11px;
          }

          .subjectAdminBar,
          .subjectMaterialActions {
            grid-template-columns: 1fr;
            gap: 9px;
            margin-bottom: 14px;
          }

          .addSubjectButton {
            min-height: 46px;
            font-size: 14px;
          }

          .subjectFolderCard {
            min-height: 135px;
            padding: 11px;
            border-radius: 12px;
          }

          .folderName3D {
            padding: 6px 10px;
            font-size: 14px;
          }

          .materialCount {
            font-size: 11px;
          }
        }



        /* FINAL HIERARCHY OVERRIDE */
        .hierarchyBox .courseGrid {
          width: min(1180px, 100%);
          margin: 12px auto 0;
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 22px !important;
        }

        .hierarchyBox .courseGrid > .hierarchyCard {
          appearance: none;
          width: 100% !important;
          min-width: 0 !important;
          min-height: 175px !important;
          padding: 22px 16px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          border: 2px solid #174461 !important;
          border-radius: 18px !important;
          color: #073b68 !important;
          background: linear-gradient(
            180deg,
            #d1f1ff 0%,
            #83cef0 48%,
            #4d9dcd 100%
          ) !important;
          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.9),
            inset 0 -4px 5px rgba(0,0,0,.13),
            0 6px 0 #17415c,
            0 11px 16px rgba(0,0,0,.20) !important;
          cursor: pointer !important;
          font-family: inherit !important;
          text-align: center !important;
        }

        .hierarchyBox .courseGrid .hierarchyBig {
          display: block !important;
          font-size: 27px !important;
          line-height: 1.1 !important;
          font-weight: 700 !important;
        }

        .hierarchyBox .courseGrid .hierarchySmall {
          display: block !important;
          margin-top: 2px !important;
          font-size: 14px !important;
          line-height: 1.2 !important;
          font-weight: 700 !important;
          opacity: .78 !important;
        }

        @media (max-width: 900px) {
          .hierarchyBox .courseGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 14px !important;
          }
        }

        @media (max-width: 600px) {
          .hierarchyBox .courseGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 9px !important;
          }

          .hierarchyBox .courseGrid > .hierarchyCard {
            min-height: 105px !important;
            padding: 11px 6px !important;
            border-radius: 11px !important;
            box-shadow:
              inset 0 3px 3px rgba(255,255,255,.85),
              0 4px 0 #17415c !important;
          }

          .hierarchyBox .courseGrid .hierarchyBig {
            font-size: 18px !important;
          }

          .hierarchyBox .courseGrid .hierarchySmall {
            font-size: 10.5px !important;
          }
        }

      `}</style>
    </main>
  );
}
