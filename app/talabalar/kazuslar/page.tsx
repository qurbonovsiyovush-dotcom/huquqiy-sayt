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

  function addNode() {
    const parentId =
      selectedId ??
      "root";

    const parent =
      nodes.find(
        (node) =>
          node.id === parentId
      ) ?? nodes[0];

    const id =
      `node-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

    setNodes((old) => [
      ...old,
      {
        id,
        text: "Yangi blok",
        x:
          parent.x +
          parent.width +
          110,
        y:
          parent.y +
          old.length * 18,
        width: 240,
        height: 76,
        color: "#d9eaf7",
        parentId:
          parent.id,
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
      <div style="
        position:relative;
        width:100%;
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
            onClick={addNode}
          >
            + Yangi to‘rtburchak
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedId("root");
              addNode();
            }}
          >
            + Qo‘shimcha shakl
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

  function insertHtml(html: string) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand("insertHTML", false, html);
    syncValue();
  }

  function insertTable() {
    const rows = Math.min(Math.max(Number(tableRows) || 1, 1), 20);
    const cols = Math.min(Math.max(Number(tableCols) || 1, 1), 10);

    let html = `
      <div style="margin:16px 0;overflow-x:auto;">
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
      "display:inline-flex;align-items:center;justify-content:center;min-width:150px;min-height:70px;padding:14px 20px;margin:12px;border:2px solid #174461;font-weight:700;text-align:center;";

    const shapes: Record<string, string> = {
      box: `<div style="${common}border-radius:14px;background:#dceffd;color:#073b68;">2D blok</div><p><br></p>`,
      circle: `<div style="${common}width:130px;height:130px;min-width:130px;min-height:130px;border-radius:50%;background:#eaf6ff;color:#073b68;">Doira</div><p><br></p>`,
      note: `<div style="${common}border-radius:10px;background:#fff4a8;color:#503f00;border-color:#9f8200;">Eslatma</div><p><br></p>`,
      block3d: `<div style="${common}border-radius:14px;background:linear-gradient(145deg,#9bd9ff,#4e9ccc);color:#073b68;box-shadow:8px 8px 0 #17415c,14px 14px 18px rgba(0,0,0,.28);">3D blok</div><p><br></p>`,
      card3d: `<div style="${common}border-radius:18px;background:linear-gradient(145deg,#eeeeee,#a7a7a7);color:#111;box-shadow:inset 0 5px 5px rgba(255,255,255,.8),0 8px 0 #555,0 14px 20px rgba(0,0,0,.3);">3D kartochka</div><p><br></p>`,
      arrow: `<div style="${common}border:none;background:transparent;color:#174461;font-size:34px;min-width:210px;">BOSQICH 1&nbsp;&nbsp;➜&nbsp;&nbsp;BOSQICH 2</div><p><br></p>`,
      timeline: `<div style="margin:18px 0;padding:18px;border-radius:14px;background:#eef6fb;border:2px solid #174461;"><b>1-bosqich</b> ━━━ ➜ <b>2-bosqich</b> ━━━ ➜ <b>3-bosqich</b></div><p><br></p>`,
      four: `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:18px 0;">
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

        <button type="button" title="Qalin" onMouseDown={(e) => { e.preventDefault(); runCommand("bold"); }}>
          <b>B</b>
        </button>

        <button type="button" title="Kursiv" onMouseDown={(e) => { e.preventDefault(); runCommand("italic"); }}>
          <i>I</i>
        </button>

        <button type="button" title="Tagiga chizish" onMouseDown={(e) => { e.preventDefault(); runCommand("underline"); }}>
          <u>U</u>
        </button>

        <button type="button" title="Ustidan chizish" onMouseDown={(e) => { e.preventDefault(); runCommand("strikeThrough"); }}>
          <s>S</s>
        </button>

        <button type="button" title="Chapga" onMouseDown={(e) => { e.preventDefault(); runCommand("justifyLeft"); }}>
          ≡←
        </button>

        <button type="button" title="Markazga" onMouseDown={(e) => { e.preventDefault(); runCommand("justifyCenter"); }}>
          ≡
        </button>

        <button type="button" title="O‘ngga" onMouseDown={(e) => { e.preventDefault(); runCommand("justifyRight"); }}>
          →≡
        </button>

        <button type="button" title="Ikki tomonga tekislash" onMouseDown={(e) => { e.preventDefault(); runCommand("justifyFull"); }}>
          ☰
        </button>

        <button type="button" title="Raqamli ro‘yxat" onMouseDown={(e) => { e.preventDefault(); runCommand("insertOrderedList"); }}>
          1.
        </button>

        <button type="button" title="Belgili ro‘yxat" onMouseDown={(e) => { e.preventDefault(); runCommand("insertUnorderedList"); }}>
          •
        </button>

        <button type="button" title="Chapdan surish" onMouseDown={(e) => { e.preventDefault(); runCommand("outdent"); }}>
          ⇤
        </button>

        <button type="button" title="Ichkariga surish" onMouseDown={(e) => { e.preventDefault(); runCommand("indent"); }}>
          ⇥
        </button>

        <button type="button" title="Bekor qilish" onMouseDown={(e) => { e.preventDefault(); runCommand("undo"); }}>
          ↶
        </button>

        <button type="button" title="Qaytarish" onMouseDown={(e) => { e.preventDefault(); runCommand("redo"); }}>
          ↷
        </button>

        <div className="toolDrop">
          <button
            type="button"
            title="Ranglar"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowColors((old) => !old)}
          >
            🎨 Rang
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

        <div className="toolDrop">
          <button
            type="button"
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
            title="Shakllar"
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
          title="Tarmoqlanuvchi diagramma yaratish"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowDiagramBuilder(true)}
        >
          ⤴ Diagramma
        </button>

        <button
          type="button"
          title="Gorizontal chiziq"
          onMouseDown={(e) => {
            e.preventDefault();
            insertHtml('<hr style="margin:18px 0;border:none;border-top:2px solid #555;"><p><br></p>');
          }}
        >
          ━
        </button>

        <button
          type="button"
          title="Formatni tozalash"
          onMouseDown={(e) => {
            e.preventDefault();
            runCommand("removeFormat");
          }}
        >
          Tx
        </button>
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
        Word uslubidagi muharrir: matn o‘lchami, rang, marker, jadval, 2D/3D shakllar, ro‘yxatlar va tekislash.
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
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
          border-bottom: 2px solid #777;
          background: linear-gradient(#f5f5f5,#c1c1c1);
        }

        .richToolbar > button,
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

        .richToolbar > button:hover,
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
          line-height: 1.55;
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
          text-align: justify;
          text-justify: inter-word;
          overflow-wrap: break-word;
          word-break: normal;
        }

        .normalParagraphMode :global(p),
        .normalParagraphMode :global(div) {
          margin: 0 0 12px;
          text-align: justify;
          text-indent: 2em;
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
            gap: 5px;
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

  const [selectedCase, setSelectedCase] = useState<PlatformCase | null>(null);

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

  function goBack() {
    if (mode !== "list") {
      setMode("list");
      setSelectedCase(null);
      setSaveMessage("");
      return;
    }

    window.location.href = "/";
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
    setSaveMessage("");
  }

  function openWriteMode() {
    resetForm();
    setMode("write");
  }

  function openUploadMode() {
    setSaveMessage("");
    setPdfFile(null);
    setPdfSubject("");
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
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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

      setSaveMessage("✅ Kazus muvaffaqiyatli saqlandi.");

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
    const q = search.trim().toLocaleLowerCase("uz");

    if (!q) return cases;

    return cases.filter((item) => {
      const extraText =
        item.type === "platform"
          ? item.caseText
          : item.originalFileName;

      const text = `${item.subject} ${item.title} ${extraText}`
        .toLocaleLowerCase("uz");

      return text.includes(q);
    });
  }, [cases, search]);

  return (
    <main className="page">
      <header className="topPanel">
        <div className="titlePlate">Talabalar — Kazuslar</div>

        <button className="backButton" type="button" onClick={goBack}>
          Orqaga
        </button>
      </header>

      {mode === "list" && (
        <>
          <section className="controlBox">
            {!roleLoading && role === "admin" && (
              <>
                <button
                  className="mainActionButton"
                  type="button"
                  onClick={openWriteMode}
                >
                  ✍ Kazusga javob yozish
                </button>

                <button
                  className="mainActionButton"
                  type="button"
                  onClick={openUploadMode}
                >
                  📄 Kazus yuklash
                </button>
              </>
            )}

            <button
              className="mainActionButton examActionButton"
              type="button"
              onClick={() => {
                window.location.href = "/talabalar/kazuslar/yakuniy";
              }}
            >
              🎓 Yakuniy nazorat kazuslari
            </button>

            <button
              className="mainActionButton examActionButton"
              type="button"
              onClick={() => {
                window.location.href = "/talabalar/kazuslar/oraliq";
              }}
            >
              📝 Oraliq nazorat kazuslari
            </button>
          </section>

          <section className="mainBox">
            <div className="sectionTitle">Kazuslar</div>

            <div className="searchRow">
              <input
                className="searchInput"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kazus yoki fan bo‘yicha qidirish..."
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
                {cases.length === 0
                  ? "Hozircha kazus qo‘shilmagan."
                  : "Qidiruv bo‘yicha kazus topilmadi."}
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

                    <div className="subjectBadge">{item.subject}</div>

                    <h2>{item.title}</h2>

                    <button
                      className="openButton"
                      type="button"
                      onClick={() => openCase(item)}
                    >
                      Ochish
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {mode === "write" && (
        <section className="editorBox">
          <div className="sectionTitle">Kazusga javob yozish</div>

          <div className="formGroup">
            <label>Fan nomi</label>

            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Masalan: Jinoyat huquqi"
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
                    {index + 1}-savol.
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
              {saving ? "Saqlanmoqda..." : "Kazusni saqlash"}
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
                  onChange={(e) => {
                    setPdfSubject(e.target.value);
                    setPdfMessage("");
                  }}
                  placeholder="Masalan: Jinoyat huquqi"
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
          <div className="sectionTitle">Kazusni o‘qish</div>

          <div className="viewerHeader">
            <div>
              <div className="viewerSubject">{selectedCase.subject}</div>
              <h1>{selectedCase.title}</h1>
            </div>

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
                        <div className="questionInlineRow viewerInlineRow">
                          <div className="questionNumberInline3D">
                            {index + 1}-savol.
                          </div>

                          <div
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
          flex: 0 0 auto;
          width: fit-content;
          min-width: 116px;
          padding: 10px 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #073b68;
          font-size: 18px;
          font-weight: 700;
          white-space: nowrap;
          border: 2px solid #174461;
          border-radius: 9px;
          background: linear-gradient(
            180deg,
            #c6edff 0%,
            #85ccef 48%,
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

        .readingViewerBox {
          padding-left: 20px;
          padding-right: 20px;
          overflow-x: hidden;
        }

        .readerToolbar {
          position: sticky;
          top: 10px;
          z-index: 60;
          width: min(1100px, 100%);
          max-width: 1100px;
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
          width: min(1100px, 100%);
          max-width: 1100px;
          min-height: 700px;
          margin: 0 auto;
          padding: 34px 24px 80px;
          overflow: auto;
          border: 3px solid #2f3437;
          border-radius: 20px;
          background: #24282b;
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
          max-width: 1100px;
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

        .viewerSubject {
          display: inline-block;
          padding: 7px 14px;
          border-radius: 18px;
          background: #9edcff;
          color: #073b68;
          font-weight: 700;
        }

        .caseTextBox {
          max-width: 1100px;
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
          line-height: 1.75;
          font-size: 18px;
          text-align: justify;
          text-justify: inter-word;
          overflow-wrap: break-word;
          word-break: normal;
        }

        .richViewerContent :global(table) {
          max-width: 100%;
        }

        .richViewerContent :global(p) {
          margin: 0 0 12px;
          text-align: justify;
          text-indent: 2em;
        }

        .richViewerContent :global(div) {
          text-align: justify;
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
          padding: 18px;
          border-radius: 14px;
          background: transparent;
          font-size: 19px;
          line-height: 1.6;
        }

        .viewerQuestion3D {
          padding: 27px 30px;
          border: 2px solid #62686c;
          border-radius: 15px;
          background: linear-gradient(145deg, #ffffff, #e1e1e1);
          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.95),
            inset 0 -4px 5px rgba(0,0,0,.08),
            0 5px 0 #666d71,
            0 10px 16px rgba(0,0,0,.18);
          text-align: justify;
          text-justify: inter-word;
        }

        .viewerInlineRow {
          align-items: flex-start;
        }

        .inlineQuestionContent {
          flex: 1 1 auto;
          min-width: 0;
          display: block;
          text-align: justify;
          text-justify: inter-word;
          font-size: 20px;
          line-height: 1.7;
        }

        .inlineQuestionContent :global(p),
        .inlineQuestionContent :global(div) {
          margin: 0;
          text-align: justify;
          text-indent: 0;
        }

        .inlineQuestionContent :global(p + p),
        .inlineQuestionContent :global(div + div) {
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
            min-width: 96px;
            padding: 8px 12px;
            font-size: 16px;
          }

          .viewerQuestion3D,
          .questionEditor3D {
            padding: 18px;
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

        @media (max-width: 520px) {
          .mainActionButton {
            min-height: 62px;
            font-size: 17px;
          }

          .controlBox {
            grid-template-columns: repeat(2, minmax(0, 1fr));
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
      `}</style>
    </main>
  );
}
