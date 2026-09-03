"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

type Handle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

const HANDLES: Handle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

function uid() {
  return `nc-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function cleanHtml(root: HTMLElement) {
  const clone =
    root.cloneNode(true) as HTMLElement;

  clone
    .querySelectorAll(
      ".nc-selected,[data-nc-ui]"
    )
    .forEach((node) => {
      node.classList.remove(
        "nc-selected"
      );

      node.removeAttribute(
        "data-nc-cell-selected"
      );

      if (
        node instanceof HTMLElement
      ) {
        node.style.boxShadow = "";
      }

      if (
        node.hasAttribute(
          "data-nc-ui"
        )
      ) {
        node.remove();
      }
    });

  return clone.innerHTML;
}

export default function QuestionDesigner({
  value,
  onChange,
  disabled = false,
}: Props) {
  const editorRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const fileRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const selectedTableCellRef =
    useRef<HTMLTableCellElement | null>(
      null
    );

  const [selectedId, setSelectedId] =
    useState<string>("");

  const [selectionBox, setSelectionBox] =
    useState<{
      left: number;
      top: number;
      width: number;
      height: number;
    } | null>(null);

  const [fill, setFill] =
    useState("#ffffff");

  const [stroke, setStroke] =
    useState("#263b46");

  const [strokeWidth, setStrokeWidth] =
    useState(2);

  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    left: number;
    top: number;
  } | null>(null);

  const resizeRef = useRef<{
    id: string;
    handle: Handle;
    startX: number;
    startY: number;
    left: number;
    top: number;
    width: number;
    height: number;
    ratio: number;
    lockRatio: boolean;
  } | null>(null);

  useEffect(() => {
    const root =
      editorRef.current;

    if (!root) return;

    if (
      cleanHtml(root) !==
      (value || "")
    ) {
      root.innerHTML =
        value || "";
    }
  }, [value]);

  useEffect(() => {
    function move(
      event: PointerEvent
    ) {
      const root =
        editorRef.current;

      if (!root) return;

      if (dragRef.current) {
        const data =
          dragRef.current;

        const node =
          root.querySelector(
            `[data-object-id="${data.id}"]`
          ) as HTMLElement | null;

        if (!node) return;

        const dx =
          event.clientX -
          data.startX;

        const dy =
          event.clientY -
          data.startY;

        node.style.left = `${Math.max(
          0,
          data.left + dx
        )}px`;

        node.style.top = `${Math.max(
          0,
          data.top + dy
        )}px`;

        emit();
        syncSelectionSoon(data.id);
      }

      if (resizeRef.current) {
        const data =
          resizeRef.current;

        const node =
          root.querySelector(
            `[data-object-id="${data.id}"]`
          ) as HTMLElement | null;

        if (!node) return;

        const dx =
          event.clientX -
          data.startX;

        const dy =
          event.clientY -
          data.startY;

        let left = data.left;
        let top = data.top;
        let width = data.width;
        let height = data.height;

        if (
          data.handle.includes(
            "e"
          )
        ) {
          width =
            data.width + dx;
        }

        if (
          data.handle.includes(
            "s"
          )
        ) {
          height =
            data.height + dy;
        }

        if (
          data.handle.includes(
            "w"
          )
        ) {
          width =
            data.width - dx;
          left =
            data.left + dx;
        }

        if (
          data.handle.includes(
            "n"
          )
        ) {
          height =
            data.height - dy;
          top =
            data.top + dy;
        }

        /*
          Venn diagrammalarida proporsiyani QAT'IY saqlaymiz.
          Shunda parent kichrayganda ichidagi matn va doiralar
          alohida-alohida siqilib, ustma-ust tushmaydi.
        */
        if (data.lockRatio) {
          const ratio =
            data.ratio || 1;

          const horizontalHandle =
            data.handle === "e" ||
            data.handle === "w";

          const verticalHandle =
            data.handle === "n" ||
            data.handle === "s";

          if (horizontalHandle) {
            width = Math.max(
              180,
              width
            );

            height =
              width / ratio;
          } else if (verticalHandle) {
            height = Math.max(
              110,
              height
            );

            width =
              height * ratio;
          } else {
            const widthScale =
              Math.abs(
                width /
                  Math.max(
                    data.width,
                    1
                  )
              );

            const heightScale =
              Math.abs(
                height /
                  Math.max(
                    data.height,
                    1
                  )
              );

            const scale =
              Math.max(
                widthScale,
                heightScale
              );

            width = Math.max(
              180,
              data.width * scale
            );

            height =
              width / ratio;
          }

          /*
            G'arb / shimol tutqichlarida qarama-qarshi chet
            joyida qolishi uchun left/top ni qayta hisoblaymiz.
          */
          if (
            data.handle.includes(
              "w"
            )
          ) {
            left =
              data.left +
              data.width -
              width;
          }

          if (
            data.handle.includes(
              "n"
            )
          ) {
            top =
              data.top +
              data.height -
              height;
          }
        } else {
          width = Math.max(
            40,
            width
          );

          height = Math.max(
            30,
            height
          );
        }

        node.style.left = `${Math.max(
          0,
          left
        )}px`;

        node.style.top = `${Math.max(
          0,
          top
        )}px`;

        node.style.width = `${width}px`;
        node.style.height = `${height}px`;

        emit();
        syncSelectionSoon(data.id);
      }
    }

    function up() {
      dragRef.current = null;
      resizeRef.current = null;
    }

    window.addEventListener(
      "pointermove",
      move
    );

    window.addEventListener(
      "pointerup",
      up
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        move
      );

      window.removeEventListener(
        "pointerup",
        up
      );
    };
  }, []);

  useEffect(() => {
    const root =
      editorRef.current;

    const wrap =
      root?.parentElement as HTMLElement | null;

    if (!selectedId) {
      setSelectionBox(null);
      return;
    }

    syncSelectionSoon(
      selectedId
    );

    const handle = () =>
      updateSelectionBox(
        selectedId
      );

    window.addEventListener(
      "resize",
      handle
    );

    wrap?.addEventListener(
      "scroll",
      handle
    );

    return () => {
      window.removeEventListener(
        "resize",
        handle
      );

      wrap?.removeEventListener(
        "scroll",
        handle
      );
    };
  }, [selectedId]);

  function emit() {
    const root =
      editorRef.current;

    if (!root) return;

    onChange(
      cleanHtml(root)
    );
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function command(
    name: string,
    argument?: string
  ) {
    if (disabled) return;

    focusEditor();

    document.execCommand(
      name,
      false,
      argument
    );

    emit();
  }

  function insertHtml(
    html: string
  ) {
    if (disabled) return;

    focusEditor();

    document.execCommand(
      "insertHTML",
      false,
      html
    );

    emit();
  }

  function selectedObject() {
    if (!selectedId) {
      return null;
    }

    return editorRef.current?.querySelector(
      `[data-object-id="${selectedId}"]`
    ) as HTMLElement | null;
  }


  function updateSelectionBox(
    id = selectedId
  ) {
    const root =
      editorRef.current;

    const wrap =
      root?.parentElement as HTMLElement | null;

    if (
      !root ||
      !wrap ||
      !id
    ) {
      setSelectionBox(null);
      return;
    }

    const node =
      root.querySelector(
        `[data-object-id="${id}"]`
      ) as HTMLElement | null;

    if (!node) {
      setSelectionBox(null);
      return;
    }

    const nodeRect =
      node.getBoundingClientRect();

    const wrapRect =
      wrap.getBoundingClientRect();

    setSelectionBox({
      left:
        nodeRect.left -
        wrapRect.left +
        wrap.scrollLeft,
      top:
        nodeRect.top -
        wrapRect.top +
        wrap.scrollTop,
      width:
        nodeRect.width,
      height:
        nodeRect.height,
    });
  }

  function syncSelectionSoon(
    id = selectedId
  ) {
    requestAnimationFrame(() =>
      updateSelectionBox(id)
    );
  }

  function applyObjectStyleValues(
    nextFill: string,
    nextStroke: string,
    nextStrokeWidth: number
  ) {
    const node =
      selectedObject();

    if (!node) return;

    const kind =
      node.getAttribute(
        "data-kind"
      ) || "";

    node.style.borderColor =
      nextStroke;

    node.style.borderWidth = `${nextStrokeWidth}px`;

    node.style.borderStyle =
      "solid";

    if (
      kind === "line"
    ) {
      node.style.background =
        nextStroke;

      node.style.boxShadow =
        "0 2px 2px rgba(0,0,0,.25)";
    } else if (
      node.classList.contains(
        "nc-3d-object"
      )
    ) {
      node.style.background =
        threeDBackground(
          nextFill
        );

      node.style.boxShadow =
        threeDShadow(
          nextStroke
        );
    } else {
      node.style.background =
        nextFill;
    }

    emit();
    syncSelectionSoon();
  }

  function applyObjectStyle() {
    applyObjectStyleValues(
      fill,
      stroke,
      strokeWidth
    );
  }

  function threeDBackground(
    base: string
  ) {
    return `linear-gradient(180deg,
      color-mix(in srgb, ${base} 58%, white) 0%,
      color-mix(in srgb, ${base} 82%, white) 18%,
      ${base} 58%,
      color-mix(in srgb, ${base} 82%, black) 100%)`;
  }

  function threeDShadow(
    borderColor: string
  ) {
    return `inset 0 4px 3px rgba(255,255,255,.72),
      inset 0 -3px 3px rgba(0,0,0,.12),
      0 7px 0 color-mix(in srgb, ${borderColor} 72%, black),
      0 10px 14px rgba(0,0,0,.22)`;
  }

  function insertObject(
    kind:
      | "rectangle"
      | "rounded"
      | "circle"
      | "ellipse"
      | "line"
  ) {
    const id = uid();

    const radius =
      kind === "circle" ||
      kind === "ellipse"
        ? "50%"
        : kind === "rounded"
        ? "24px"
        : "4px";

    const width =
      kind === "circle"
        ? 180
        : kind === "ellipse"
        ? 300
        : kind === "line"
        ? 320
        : 280;

    const height =
      kind === "circle"
        ? 180
        : kind === "ellipse"
        ? 160
        : kind === "line"
        ? 6
        : 120;

    const text =
      kind === "line"
        ? ""
        : "Matn";

    const background =
      kind === "line"
        ? stroke
        : threeDBackground(
            fill
          );

    const shadow =
      kind === "line"
        ? "0 2px 2px rgba(0,0,0,.25)"
        : threeDShadow(
            stroke
          );

    insertHtml(
      `<div class="nc-object nc-3d-object" data-object-id="${id}" data-kind="${kind}" contenteditable="${
        kind === "line"
          ? "false"
          : "true"
      }" style="position:relative;display:flex;align-items:center;justify-content:center;width:${width}px;height:${height}px;min-width:40px;min-height:${
        kind === "line"
          ? 4
          : 30
      }px;margin:18px auto;padding:${
        kind === "line"
          ? 0
          : 12
      }px;border:${strokeWidth}px solid ${stroke};border-radius:${radius};background:${background};box-shadow:${shadow};font-weight:800;text-align:center;box-sizing:border-box;">${text}</div><p><br></p>`
    );
  }

  function insertVenn2() {
    const id = uid();
    const clipId = `clip-${id}`;

    /*
      MUHIM:
      Venn ichidagi HAMMA narsa bitta SVG ichida.
      Shuning uchun obyektni kichraytirganda aylana va yozuvlar
      bir xil nisbatda kichrayadi, bir-biriga yopishib ketmaydi.
    */
    insertHtml(
      `<div class="nc-object nc-venn2" data-object-id="${id}" data-kind="venn2" data-lock-ratio="true" contenteditable="false"
        style="position:relative;width:760px;max-width:96%;height:420px;margin:22px auto;border:0;background:#fff;overflow:visible;box-sizing:border-box;">
        <svg viewBox="0 0 760 420" width="100%" height="100%"
          preserveAspectRatio="xMidYMid meet"
          style="display:block;width:100%;height:100%;overflow:visible;">
          <defs>
            <clipPath id="${clipId}">
              <ellipse cx="300" cy="220" rx="205" ry="125"></ellipse>
            </clipPath>
          </defs>

          <text x="180" y="35" text-anchor="middle"
            font-family="Georgia,Times New Roman,serif"
            font-size="18" font-weight="800">I — Unitar davlatga xos</text>

          <text x="580" y="35" text-anchor="middle"
            font-family="Georgia,Times New Roman,serif"
            font-size="18" font-weight="800">II — Federativ davlatga xos</text>

          <ellipse cx="460" cy="220" rx="205" ry="125"
            fill="#bca7e8"
            fill-opacity="0.72"
            clip-path="url(#${clipId})"></ellipse>

          <ellipse cx="300" cy="220" rx="205" ry="125"
            fill="white"
            fill-opacity="0.01"
            stroke="#263b46"
            stroke-width="3"></ellipse>

          <ellipse cx="460" cy="220" rx="205" ry="125"
            fill="white"
            fill-opacity="0.01"
            stroke="#263b46"
            stroke-width="3"></ellipse>

          <text x="225" y="229" text-anchor="middle"
            font-family="Georgia,Times New Roman,serif"
            font-size="25" font-weight="800">I</text>

          <text x="535" y="229" text-anchor="middle"
            font-family="Georgia,Times New Roman,serif"
            font-size="25" font-weight="800">II</text>

          <text x="380" y="229" text-anchor="middle"
            font-family="Georgia,Times New Roman,serif"
            font-size="25" font-weight="900">III</text>

          <text x="380" y="400" text-anchor="middle"
            font-family="Georgia,Times New Roman,serif"
            font-size="18" font-weight="800">III — har ikkalasiga xos</text>
        </svg>
      </div><p><br></p>`
    );
  }

  function insertVenn3() {
    const id = uid();

    /*
      3 doirali Venn ham to'liq SVG.
      Resize paytida barcha doira va yozuvlar proporsional o'zgaradi.
    */
    insertHtml(
      `<div class="nc-object nc-venn3" data-object-id="${id}" data-kind="venn3" data-lock-ratio="true" contenteditable="false"
        style="position:relative;width:720px;max-width:96%;height:470px;margin:22px auto;border:0;background:#fff;overflow:visible;box-sizing:border-box;">
        <svg viewBox="0 0 720 470" width="100%" height="100%"
          preserveAspectRatio="xMidYMid meet"
          style="display:block;width:100%;height:100%;overflow:visible;">

          <ellipse cx="285" cy="195" rx="170" ry="125"
            fill="rgba(77,176,225,.12)"
            stroke="#263b46" stroke-width="3"></ellipse>

          <ellipse cx="435" cy="195" rx="170" ry="125"
            fill="rgba(85,204,155,.12)"
            stroke="#263b46" stroke-width="3"></ellipse>

          <ellipse cx="360" cy="310" rx="170" ry="125"
            fill="rgba(241,187,74,.12)"
            stroke="#263b46" stroke-width="3"></ellipse>

          <g font-family="Georgia,Times New Roman,serif"
             font-size="18" font-weight="800" text-anchor="middle">
            <text x="170" y="38">A to‘plam</text>
            <text x="550" y="38">B to‘plam</text>
            <text x="360" y="458">C to‘plam</text>

            <text x="205" y="185">I</text>
            <text x="515" y="185">II</text>
            <text x="360" y="390">III</text>
            <text x="360" y="155">IV</text>
            <text x="280" y="285">V</text>
            <text x="440" y="285">VI</text>
            <text x="360" y="245" font-weight="900">VII</text>
          </g>
        </svg>
      </div><p><br></p>`
    );
  }

  function insertTable() {
    const id = uid();

    const rows =
      Math.max(
        1,
        Math.min(
          15,
          Number(
            window.prompt(
              "Qatorlar soni:",
              "3"
            ) || 3
          )
        )
      );

    const cols =
      Math.max(
        1,
        Math.min(
          12,
          Number(
            window.prompt(
              "Ustunlar soni:",
              "3"
            ) || 3
          )
        )
      );

    const body =
      Array.from(
        { length: rows },
        (_, r) =>
          `<tr>${Array.from(
            { length: cols },
            (_, c) =>
              `<td style="border:2px solid #263b46;padding:10px;min-width:80px;height:44px;">${
                r === 0
                  ? `Sarlavha ${
                      c + 1
                    }`
                  : ""
              }</td>`
          ).join("")}</tr>`
      ).join("");

    insertHtml(
      `<div class="nc-table-wrap nc-object" data-object-id="${id}" data-kind="table" contenteditable="false" style="position:relative;overflow-x:auto;margin:16px 0;width:100%;box-sizing:border-box;border:2px solid #536a75;border-radius:10px;background:#fff;box-shadow:inset 0 3px 3px rgba(255,255,255,.75),0 6px 0 #617782,0 9px 12px rgba(0,0,0,.18);"><table style="width:100%;border-collapse:collapse;background:#fff;">${body}</table></div><p><br></p>`
    );
  }

  function insertManualTable() {
    const id = uid();

    insertHtml(
      `<div class="nc-table-object nc-object" data-object-id="${id}" data-kind="manual-table" contenteditable="false" style="position:relative;width:620px;max-width:96%;margin:18px auto;background:#fff;padding:4px;box-sizing:border-box;border:2px solid #536a75;border-radius:10px;box-shadow:inset 0 3px 3px rgba(255,255,255,.75),0 6px 0 #617782,0 9px 12px rgba(0,0,0,.18);">
        <table data-manual-table="true" contenteditable="false" style="width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;">
          <tbody>
            <tr>
              <td contenteditable="true" style="border:2px solid #263b46;height:58px;padding:8px;vertical-align:middle;"></td>
            </tr>
          </tbody>
        </table>
      </div><p><br></p>`
    );
  }

  function currentTableCell() {
    return selectedTableCellRef.current;
  }

  function currentTable() {
    const cell = currentTableCell();
    return cell?.closest("table") as HTMLTableElement | null;
  }

  function selectTableCell(
    cell: HTMLTableCellElement | null
  ) {
    editorRef.current
      ?.querySelectorAll("[data-nc-cell-selected='true']")
      .forEach((node) => {
        node.removeAttribute("data-nc-cell-selected");
        (node as HTMLElement).style.boxShadow = "";
      });

    selectedTableCellRef.current = cell;

    if (cell) {
      cell.setAttribute("data-nc-cell-selected", "true");
      cell.style.boxShadow = "inset 0 0 0 3px #0a9ee8";
    }
  }

  function addTableRow() {
    const table = currentTable();
    const cell = currentTableCell();

    if (!table || !cell) {
      window.alert("Avval jadval katagini bosing.");
      return;
    }

    const row = cell.parentElement as HTMLTableRowElement;
    const newRow = table.insertRow(row.rowIndex + 1);

    const columns = Math.max(
      1,
      row.cells.length
    );

    for (let i = 0; i < columns; i++) {
      const td = newRow.insertCell();
      td.contentEditable = "true";
      td.style.border = "2px solid #263b46";
      td.style.height = "58px";
      td.style.padding = "8px";
      td.style.verticalAlign = "middle";
    }

    emit();
  }

  function addTableColumn() {
    const table = currentTable();
    const cell = currentTableCell();

    if (!table || !cell) {
      window.alert("Avval jadval katagini bosing.");
      return;
    }

    const colIndex =
      cell.cellIndex + 1;

    Array.from(table.rows).forEach((row) => {
      const td = row.insertCell(
        Math.min(
          colIndex,
          row.cells.length
        )
      );

      td.contentEditable = "true";
      td.style.border = "2px solid #263b46";
      td.style.height = "58px";
      td.style.padding = "8px";
      td.style.verticalAlign = "middle";
    });

    emit();
  }

  function deleteTableRow() {
    const table = currentTable();
    const cell = currentTableCell();

    if (!table || !cell) {
      window.alert("Avval jadval katagini bosing.");
      return;
    }

    if (table.rows.length <= 1) {
      window.alert("Jadvalda kamida 1 qator qolishi kerak.");
      return;
    }

    const row = cell.parentElement as HTMLTableRowElement;
    table.deleteRow(row.rowIndex);
    selectTableCell(null);
    emit();
  }

  function deleteTableColumn() {
    const table = currentTable();
    const cell = currentTableCell();

    if (!table || !cell) {
      window.alert("Avval jadval katagini bosing.");
      return;
    }

    if (cell.parentElement && (cell.parentElement as HTMLTableRowElement).cells.length <= 1) {
      window.alert("Jadvalda kamida 1 ustun qolishi kerak.");
      return;
    }

    const index = cell.cellIndex;

    Array.from(table.rows).forEach((row) => {
      if (row.cells[index]) {
        row.deleteCell(index);
      }
    });

    selectTableCell(null);
    emit();
  }

  function mergeCellRight() {
    const cell = currentTableCell();

    if (!cell) {
      window.alert("Avval jadval katagini bosing.");
      return;
    }

    const row =
      cell.parentElement as HTMLTableRowElement;

    const next =
      row.cells[cell.cellIndex + 1];

    if (!next) {
      window.alert("O‘ng tomonda qo‘shiladigan katak yo‘q.");
      return;
    }

    cell.colSpan =
      (cell.colSpan || 1) +
      (next.colSpan || 1);

    if (next.innerHTML.trim()) {
      cell.innerHTML +=
        (cell.innerHTML.trim() ? "<br>" : "") +
        next.innerHTML;
    }

    next.remove();
    emit();
  }

  function mergeCellDown() {
    const table = currentTable();
    const cell = currentTableCell();

    if (!table || !cell) {
      window.alert("Avval jadval katagini bosing.");
      return;
    }

    const row =
      cell.parentElement as HTMLTableRowElement;

    const nextRow =
      table.rows[row.rowIndex + 1];

    if (!nextRow) {
      window.alert("Pastda qo‘shiladigan katak yo‘q.");
      return;
    }

    const below =
      nextRow.cells[
        Math.min(
          cell.cellIndex,
          nextRow.cells.length - 1
        )
      ];

    if (!below) return;

    cell.rowSpan =
      (cell.rowSpan || 1) +
      (below.rowSpan || 1);

    if (below.innerHTML.trim()) {
      cell.innerHTML +=
        (cell.innerHTML.trim() ? "<br>" : "") +
        below.innerHTML;
    }

    below.remove();
    emit();
  }

  function splitCell() {
    const cell = currentTableCell();

    if (!cell) {
      window.alert("Avval jadval katagini bosing.");
      return;
    }

    const row =
      cell.parentElement as HTMLTableRowElement;

    if (cell.colSpan > 1) {
      const count = cell.colSpan;
      cell.colSpan = 1;

      for (let i = 1; i < count; i++) {
        const td = row.insertCell(
          cell.cellIndex + i
        );

        td.contentEditable = "true";
        td.style.border = "2px solid #263b46";
        td.style.height = "58px";
        td.style.padding = "8px";
      }

      emit();
      return;
    }

    if (cell.rowSpan > 1) {
      const table = currentTable();
      if (!table) return;

      const startRow =
        row.rowIndex;

      const count =
        cell.rowSpan;

      cell.rowSpan = 1;

      for (let i = 1; i < count; i++) {
        const targetRow =
          table.rows[
            startRow + i
          ];

        if (!targetRow) continue;

        const td =
          targetRow.insertCell(
            Math.min(
              cell.cellIndex,
              targetRow.cells.length
            )
          );

        td.contentEditable = "true";
        td.style.border = "2px solid #263b46";
        td.style.height = "58px";
        td.style.padding = "8px";
      }

      emit();
      return;
    }

    window.alert("Bu katak birlashtirilmagan.");
  }

  async function copySelected() {
    const node =
      selectedObject();

    if (!node) return;

    try {
      await navigator.clipboard.writeText(
        node.outerHTML
      );
    } catch {
      // Browser clipboard permission may be unavailable.
    }
  }

  async function pasteObject() {
    try {
      const html =
        await navigator.clipboard.readText();

      if (
        html.includes(
          "data-object-id"
        )
      ) {
        insertHtml(
          html.replace(
            /data-object-id="[^"]+"/,
            `data-object-id="${uid()}"`
          ) + "<p><br></p>"
        );
      }
    } catch {
      window.alert(
        "Brauzer clipboard ruxsatini bermadi. Ctrl+V dan foydalaning."
      );
    }
  }

  function duplicateSelected() {
    const node =
      selectedObject();

    if (!node) return;

    const clone =
      node.cloneNode(
        true
      ) as HTMLElement;

    clone.setAttribute(
      "data-object-id",
      uid()
    );

    node.insertAdjacentElement(
      "afterend",
      clone
    );

    emit();
  }

  function deleteSelected() {
    const node =
      selectedObject();

    if (!node) return;

    node.remove();
    setSelectedId("");
    emit();
  }

  function layer(
    direction:
      | "front"
      | "back"
  ) {
    const node =
      selectedObject();

    if (!node) return;

    const current =
      Number(
        node.style.zIndex || 1
      );

    node.style.zIndex =
      String(
        direction ===
          "front"
          ? current + 1
          : Math.max(
              0,
              current - 1
            )
      );

    emit();
  }

  function ensureObjectForTarget(
    target: HTMLElement
  ) {
    const existing =
      target.closest(
        "[data-object-id]"
      ) as HTMLElement | null;

    if (existing) {
      return existing;
    }

    if (
      target.tagName !== "IMG"
    ) {
      return null;
    }

    const img =
      target as HTMLImageElement;

    const id = uid();

    const rect =
      img.getBoundingClientRect();

    const width =
      Math.max(
        80,
        Math.round(
          rect.width ||
            img.width ||
            img.naturalWidth ||
            320
        )
      );

    const height =
      Math.max(
        60,
        Math.round(
          rect.height ||
            img.height ||
            img.naturalHeight ||
            220
        )
      );

    const wrapper =
      document.createElement(
        "div"
      );

    wrapper.className =
      "nc-object nc-image-object nc-3d-object";

    wrapper.setAttribute(
      "data-object-id",
      id
    );

    wrapper.setAttribute(
      "data-kind",
      "image"
    );

    wrapper.setAttribute(
      "contenteditable",
      "false"
    );

    wrapper.style.position =
      "relative";

    wrapper.style.display =
      "inline-block";

    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;
    wrapper.style.maxWidth =
      "96%";
    wrapper.style.margin =
      "18px auto";
    wrapper.style.border =
      "2px solid #263b46";
    wrapper.style.borderRadius =
      "10px";
    wrapper.style.background =
      "linear-gradient(180deg,#ffffff,#e8eef2)";
    wrapper.style.boxShadow =
      "inset 0 3px 3px rgba(255,255,255,.75),0 7px 0 #526b77,0 10px 14px rgba(0,0,0,.22)";
    wrapper.style.overflow =
      "visible";
    wrapper.style.boxSizing =
      "border-box";

    img.parentNode?.insertBefore(
      wrapper,
      img
    );

    wrapper.appendChild(img);

    img.style.display =
      "block";
    img.style.width =
      "100%";
    img.style.height =
      "100%";
    img.style.maxWidth =
      "none";
    img.style.objectFit =
      "contain";
    img.style.userSelect =
      "none";
    img.style.pointerEvents =
      "none";

    emit();

    return wrapper;
  }

  function onEditorClick(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    const target =
      event.target as HTMLElement;

    const clickedCell =
      target.closest(
        "td,th"
      ) as HTMLTableCellElement | null;

    selectTableCell(
      clickedCell
    );

    const object =
      ensureObjectForTarget(
        target
      );

    editorRef.current
      ?.querySelectorAll(
        ".nc-selected"
      )
      .forEach((node) =>
        node.classList.remove(
          "nc-selected"
        )
      );

    if (!object) {
      setSelectedId("");
      setSelectionBox(null);
      return;
    }

    object.classList.add(
      "nc-selected"
    );

    const id =
      object.getAttribute(
        "data-object-id"
      ) || "";

    setSelectedId(id);

    syncSelectionSoon(id);

    const computed =
      getComputedStyle(object);

    setFill(
      computed.backgroundColor ||
        "#ffffff"
    );

    setStroke(
      computed.borderColor ||
        "#263b46"
    );

    setStrokeWidth(
      parseInt(
        computed.borderWidth
      ) || 2
    );
  }

  function onEditorPointerDown(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (
      disabled ||
      event.button !== 0
    ) {
      return;
    }

    const target =
      event.target as HTMLElement;

    const object =
      ensureObjectForTarget(
        target
      );

    if (!object) {
      return;
    }

    const id =
      object.getAttribute(
        "data-object-id"
      ) || "";

    if (!id) {
      return;
    }

    const rect =
      object.getBoundingClientRect();

    const edge = 14;

    const nearEdge =
      event.clientX -
        rect.left <= edge ||
      rect.right -
        event.clientX <= edge ||
      event.clientY -
        rect.top <= edge ||
      rect.bottom -
        event.clientY <= edge;

    const kind =
      object.getAttribute(
        "data-kind"
      ) || "";

    const dragAnywhere =
      kind === "image";

    if (
      !nearEdge &&
      !dragAnywhere
    ) {
      return;
    }

    setSelectedId(id);
    syncSelectionSoon(id);

    const root =
      editorRef.current;

    if (!root) return;

    if (
      object.style.position !==
      "absolute"
    ) {
      const rootRect =
        root.getBoundingClientRect();

      const objectRect =
        object.getBoundingClientRect();

      object.style.position =
        "absolute";

      object.style.left = `${Math.max(
        0,
        objectRect.left -
          rootRect.left +
          root.scrollLeft
      )}px`;

      object.style.top = `${Math.max(
        0,
        objectRect.top -
          rootRect.top +
          root.scrollTop
      )}px`;

      object.style.margin = "0";
    }

    dragRef.current = {
      id,
      startX:
        event.clientX,
      startY:
        event.clientY,
      left:
        parseFloat(
          object.style.left
        ) || object.offsetLeft,
      top:
        parseFloat(
          object.style.top
        ) || object.offsetTop,
    };

    event.preventDefault();
    event.stopPropagation();
  }

  function startDrag(
    event: React.PointerEvent
  ) {
    if (
      disabled ||
      !selectedId
    ) {
      return;
    }

    const node =
      selectedObject();

    if (!node) return;

    const root =
      editorRef.current;

    if (!root) return;

    if (
      node.style.position !==
        "absolute"
    ) {
      const rootRect =
        root.getBoundingClientRect();

      const nodeRect =
        node.getBoundingClientRect();

      node.style.position =
        "absolute";

      node.style.left = `${Math.max(
        0,
        nodeRect.left -
          rootRect.left +
          root.scrollLeft
      )}px`;

      node.style.top = `${Math.max(
        0,
        nodeRect.top -
          rootRect.top +
          root.scrollTop
      )}px`;

      node.style.margin = "0";
    }

    dragRef.current = {
      id: selectedId,
      startX:
        event.clientX,
      startY:
        event.clientY,
      left:
        parseFloat(
          node.style.left
        ) || node.offsetLeft,
      top:
        parseFloat(
          node.style.top
        ) || node.offsetTop,
    };

    event.preventDefault();
  }

  function startResize(
    event: React.PointerEvent,
    handle: Handle
  ) {
    if (
      disabled ||
      !selectedId
    ) {
      return;
    }

    const node =
      selectedObject();

    if (!node) return;

    const root =
      editorRef.current;

    if (!root) return;

    if (
      node.style.position !==
        "absolute"
    ) {
      const rootRect =
        root.getBoundingClientRect();

      const nodeRect =
        node.getBoundingClientRect();

      node.style.position =
        "absolute";

      node.style.left = `${Math.max(
        0,
        nodeRect.left -
          rootRect.left +
          root.scrollLeft
      )}px`;

      node.style.top = `${Math.max(
        0,
        nodeRect.top -
          rootRect.top +
          root.scrollTop
      )}px`;

      node.style.margin = "0";
    }

    resizeRef.current = {
      id: selectedId,
      handle,
      startX:
        event.clientX,
      startY:
        event.clientY,
      left:
        parseFloat(
          node.style.left
        ) || node.offsetLeft,
      top:
        parseFloat(
          node.style.top
        ) || node.offsetTop,
      width:
        node.offsetWidth,
      height:
        node.offsetHeight,
      ratio:
        node.offsetWidth /
        Math.max(
          node.offsetHeight,
          1
        ),
      lockRatio:
        node.getAttribute(
          "data-lock-ratio"
        ) === "true",
    };

    event.preventDefault();
    event.stopPropagation();
  }

  function addImage(
    file: File
  ) {
    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const id = uid();

      insertHtml(
        `<div class="nc-object nc-image-object nc-3d-object" data-object-id="${id}" data-kind="image" contenteditable="false" style="position:relative;width:420px;height:280px;max-width:96%;margin:18px auto;border:2px solid #263b46;border-radius:10px;background:linear-gradient(180deg,#ffffff,#e8eef2);box-shadow:inset 0 3px 3px rgba(255,255,255,.75),0 7px 0 #526b77,0 10px 14px rgba(0,0,0,.22);overflow:visible;"><img src="${String(
          reader.result || ""
        )}" alt="Savol rasmi" style="width:100%;height:100%;object-fit:contain;display:block;" /></div><p><br></p>`
      );
    };

    reader.readAsDataURL(
      file
    );
  }

  return (
    <section className="designer">
      <div className="toolbar">
        <button
          type="button"
          onClick={() =>
            command("undo")
          }
          disabled={disabled}
          title="Undo"
        >
          ↶
        </button>

        <button
          type="button"
          onClick={() =>
            command("redo")
          }
          disabled={disabled}
          title="Redo"
        >
          ↷
        </button>

        <select
          defaultValue="Bell MT"
          onChange={(e) =>
            command(
              "fontName",
              e.target.value
            )
          }
          disabled={disabled}
        >
          <option>
            Bell MT
          </option>
          <option>
            Georgia
          </option>
          <option>
            Arial
          </option>
          <option>
            Times New Roman
          </option>
        </select>

        <select
          defaultValue="3"
          onChange={(e) =>
            command(
              "fontSize",
              e.target.value
            )
          }
          disabled={disabled}
        >
          <option value="2">
            14
          </option>
          <option value="3">
            16
          </option>
          <option value="4">
            18
          </option>
          <option value="5">
            24
          </option>
          <option value="6">
            32
          </option>
        </select>

        <button
          type="button"
          onClick={() =>
            command("bold")
          }
          disabled={disabled}
        >
          <b>B</b>
        </button>

        <button
          type="button"
          onClick={() =>
            command("italic")
          }
          disabled={disabled}
        >
          <i>I</i>
        </button>

        <button
          type="button"
          onClick={() =>
            command(
              "underline"
            )
          }
          disabled={disabled}
        >
          <u>U</u>
        </button>

        <label
          className="colorTool"
          title="Matn rangi"
        >
          A
          <input
            type="color"
            onChange={(e) =>
              command(
                "foreColor",
                e.target.value
              )
            }
            disabled={disabled}
          />
        </label>

        <label
          className="colorTool"
          title="Marker/fon"
        >
          ▰
          <input
            type="color"
            onChange={(e) =>
              command(
                "hiliteColor",
                e.target.value
              )
            }
            disabled={disabled}
          />
        </label>

        <button
          type="button"
          onClick={() =>
            command(
              "justifyLeft"
            )
          }
          disabled={disabled}
        >
          ≡←
        </button>

        <button
          type="button"
          onClick={() =>
            command(
              "justifyCenter"
            )
          }
          disabled={disabled}
        >
          ≡
        </button>

        <button
          type="button"
          onClick={() =>
            command(
              "justifyRight"
            )
          }
          disabled={disabled}
        >
          →≡
        </button>

        <button
          type="button"
          onClick={() =>
            command(
              "insertUnorderedList"
            )
          }
          disabled={disabled}
        >
          • List
        </button>

        <button
          type="button"
          onClick={() =>
            command(
              "insertOrderedList"
            )
          }
          disabled={disabled}
        >
          1. List
        </button>
      </div>

      <div className="toolbar second">
        <button
          type="button"
          onClick={() =>
            fileRef.current?.click()
          }
          disabled={disabled}
        >
          🖼 Rasm
        </button>

        <button
          type="button"
          onClick={insertTable}
          disabled={disabled}
        >
          ▦ Jadval
        </button>

        <button
          type="button"
          onClick={
            insertManualTable
          }
          disabled={disabled}
        >
          ✎ Qo‘lda jadval
        </button>

        <button
          type="button"
          onClick={addTableRow}
          disabled={disabled}
        >
          + Qator
        </button>

        <button
          type="button"
          onClick={addTableColumn}
          disabled={disabled}
        >
          + Ustun
        </button>

        <button
          type="button"
          onClick={deleteTableRow}
          disabled={disabled}
        >
          − Qator
        </button>

        <button
          type="button"
          onClick={deleteTableColumn}
          disabled={disabled}
        >
          − Ustun
        </button>

        <button
          type="button"
          onClick={mergeCellRight}
          disabled={disabled}
        >
          Birlashtir →
        </button>

        <button
          type="button"
          onClick={mergeCellDown}
          disabled={disabled}
        >
          Birlashtir ↓
        </button>

        <button
          type="button"
          onClick={splitCell}
          disabled={disabled}
        >
          Katakni ajrat
        </button>

        <button
          type="button"
          onClick={() =>
            insertObject(
              "line"
            )
          }
          disabled={disabled}
        >
          ━ Chiziq
        </button>

        <button
          type="button"
          onClick={() =>
            insertObject(
              "rectangle"
            )
          }
          disabled={disabled}
        >
          ▭ To‘rtburchak
        </button>

        <button
          type="button"
          onClick={() =>
            insertObject(
              "rounded"
            )
          }
          disabled={disabled}
        >
          ▢ Yumaloq
        </button>

        <button
          type="button"
          onClick={() =>
            insertObject(
              "circle"
            )
          }
          disabled={disabled}
        >
          ○ Aylana
        </button>

        <button
          type="button"
          onClick={() =>
            insertObject(
              "ellipse"
            )
          }
          disabled={disabled}
        >
          ⬭ Ellips
        </button>

        <button
          type="button"
          onClick={insertVenn2}
          disabled={disabled}
        >
          ◯◯ Venn 2
        </button>

        <button
          type="button"
          onClick={insertVenn3}
          disabled={disabled}
        >
          ◯◯◯ Venn 3
        </button>
      </div>

      <div className="toolbar objectTools">
        <strong>
          Tanlangan obyekt:
        </strong>

        <button
          type="button"
          onClick={
            copySelected
          }
          disabled={
            disabled ||
            !selectedId
          }
        >
          Copy
        </button>

        <button
          type="button"
          onClick={
            pasteObject
          }
          disabled={disabled}
        >
          Paste
        </button>

        <button
          type="button"
          onClick={
            duplicateSelected
          }
          disabled={
            disabled ||
            !selectedId
          }
        >
          Duplicate
        </button>

        <button
          type="button"
          onClick={() =>
            layer("front")
          }
          disabled={
            disabled ||
            !selectedId
          }
        >
          Oldinga
        </button>

        <button
          type="button"
          onClick={() =>
            layer("back")
          }
          disabled={
            disabled ||
            !selectedId
          }
        >
          Orqaga
        </button>

        <label>
          Fon
          <input
            type="color"
            value={
              /^#[0-9a-f]{6}$/i.test(
                fill
              )
                ? fill
                : "#ffffff"
            }
            onChange={(e) => {
              const value =
                e.target.value;

              setFill(value);

              applyObjectStyleValues(
                value,
                stroke,
                strokeWidth
              );
            }}
            disabled={
              disabled ||
              !selectedId
            }
          />
        </label>

        <label>
          Chegara
          <input
            type="color"
            value={
              /^#[0-9a-f]{6}$/i.test(
                stroke
              )
                ? stroke
                : "#263b46"
            }
            onChange={(e) => {
              const value =
                e.target.value;

              setStroke(value);

              applyObjectStyleValues(
                fill,
                value,
                strokeWidth
              );
            }}
            disabled={
              disabled ||
              !selectedId
            }
          />
        </label>

        <label>
          px
          <input
            className="strokeNumber"
            type="number"
            min="0"
            max="12"
            value={
              strokeWidth
            }
            onChange={(e) => {
              const value =
                Number(
                  e.target.value
                ) || 0;

              setStrokeWidth(
                value
              );

              applyObjectStyleValues(
                fill,
                stroke,
                value
              );
            }}
            disabled={
              disabled ||
              !selectedId
            }
          />
        </label>

        <button
          type="button"
          onClick={
            applyObjectStyle
          }
          disabled={
            disabled ||
            !selectedId
          }
        >
          Rangni qo‘llash
        </button>

        <button
          type="button"
          className="danger"
          onClick={
            deleteSelected
          }
          disabled={
            disabled ||
            !selectedId
          }
        >
          O‘chirish
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file =
            event.target
              .files?.[0];

          if (file) {
            addImage(file);
          }

          event.target.value =
            "";
        }}
      />

      <div className="canvasWrap">
        <div
          ref={editorRef}
          className="canvas"
          contentEditable={
            !disabled
          }
          suppressContentEditableWarning
          onInput={emit}
          onClick={
            onEditorClick
          }
          onPointerDown={
            onEditorPointerDown
          }
          onPaste={() =>
            setTimeout(
              emit,
              0
            )
          }
        />

        {selectedId &&
          selectionBox && (
          <div
            className="selectionUi"
            data-nc-ui="true"
            style={{
              left:
                selectionBox.left,
              top:
                selectionBox.top,
              width:
                selectionBox.width,
              height:
                selectionBox.height,
            }}
          >
            <button
              type="button"
              className="deleteBubble"
              onClick={
                deleteSelected
              }
              title="O‘chirish"
            >
              ×
            </button>

            {HANDLES.map(
              (handle) => (
                <button
                  key={
                    handle
                  }
                  type="button"
                  className={`resizeHandle ${handle}`}
                  onPointerDown={(
                    event
                  ) =>
                    startResize(
                      event,
                      handle
                    )
                  }
                  title={`${handle} resize`}
                />
              )
            )}
          </div>
        )}
      </div>

      <p className="hint">
        Obyektni tanlang.
        8 ta nuqtadan tortib
        o‘lchamini o‘zgartiring.
        Shakl chegarasidan
        ushlab sudrashingiz mumkin.
        Rasm, Venn, jadval va
        boshqa obyektlar ham
        bir xil ishlaydi.
      </p>

      <style jsx>{`
        .designer {
          margin-top: 10px;
        }

        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          align-items: center;
          padding: 9px;
          border: 2px solid #526974;
          border-radius: 11px 11px 0 0;
          background: linear-gradient(
            180deg,
            #f8fafb,
            #cbd6dc
          );
          box-shadow:
            inset 0 3px 2px #fff;
        }

        .toolbar.second,
        .toolbar.objectTools {
          border-top: 0;
          border-radius: 0;
        }

        .toolbar button,
        .toolbar select,
        .toolbar label {
          min-height: 38px;
          border: 1.5px solid #4b626d;
          border-radius: 7px;
          background: linear-gradient(
            180deg,
            #fff,
            #d4dde2
          );
          padding: 0 10px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .toolbar button {
          cursor: pointer;
        }

        .toolbar button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .toolbar .danger {
          color: #fff;
          background: linear-gradient(
            180deg,
            #ef7777,
            #b62626
          );
        }

        .colorTool input,
        .objectTools input[type="color"] {
          width: 28px;
          height: 26px;
          padding: 0;
          border: 0;
          background: transparent;
        }

        .strokeNumber {
          width: 55px;
        }

        .canvasWrap {
          position: relative;
          border: 2px solid #526974;
          border-radius: 0 0 12px 12px;
          background: #dbe4e9;
          padding: 14px;
          overflow: auto;
        }

        .canvas {
          position: relative;
          min-height: 560px;
          width: 100%;
          padding: 24px;
          outline: none;
          background: #fff;
          color: #111;
          font-family:
            "Bell MT",
            Georgia,
            "Times New Roman",
            serif;
          font-size: 18px;
          line-height: 1.5;
          box-shadow:
            inset 0 0 0 1px #b4c2c9;
          overflow: hidden;
        }

        .canvas :global(.nc-object) {
          cursor: pointer;
        }

        .canvas :global(.nc-image-object) {
          cursor: grab;
          touch-action: none;
        }

        .canvas :global(.nc-image-object:active) {
          cursor: grabbing;
        }

        .canvas :global(.nc-selected) {
          outline: none !important;
        }

        .selectionUi {
          position: absolute;
          z-index: 999;
          border: 2px dashed #078bcf;
          box-sizing: border-box;
          pointer-events: none;
        }

        .deleteBubble {
          position: absolute;
          right: -19px;
          top: -21px;
          z-index: 1002;
          width: 36px;
          height: 36px;
          padding: 0;
          border: 2px solid #8b0f12;
          border-radius: 50%;
          background: linear-gradient(
            180deg,
            #f44343,
            #b71218
          );
          color: #fff;
          box-shadow:
            inset 0 2px 2px rgba(255,255,255,.55),
            0 2px 3px rgba(0,0,0,.35);
          font-size: 28px;
          line-height: 30px;
          font-weight: 400;
          pointer-events: auto;
          cursor: pointer;
        }

        .resizeHandle {
          position: absolute;
          z-index: 1001;
          width: 18px;
          height: 18px;
          padding: 0;
          border: 2px solid #006eaa;
          border-radius: 4px;
          background: #fff;
          box-shadow:
            inset 0 0 0 2px #e8f7ff;
          pointer-events: auto;
        }

        .resizeHandle.nw {
          left: -10px;
          top: -10px;
          cursor: nwse-resize;
        }

        .resizeHandle.n {
          left: 50%;
          top: -10px;
          transform: translateX(-50%);
          cursor: ns-resize;
        }

        .resizeHandle.ne {
          right: -10px;
          top: -10px;
          cursor: nesw-resize;
        }

        .resizeHandle.e {
          right: -10px;
          top: 50%;
          transform: translateY(-50%);
          cursor: ew-resize;
        }

        .resizeHandle.se {
          right: -10px;
          bottom: -10px;
          cursor: nwse-resize;
        }

        .resizeHandle.s {
          left: 50%;
          bottom: -10px;
          transform: translateX(-50%);
          cursor: ns-resize;
        }

        .resizeHandle.sw {
          left: -10px;
          bottom: -10px;
          cursor: nesw-resize;
        }

        .resizeHandle.w {
          left: -10px;
          top: 50%;
          transform: translateY(-50%);
          cursor: ew-resize;
        }


        .canvas :global(.nc-3d-object) {
          transition:
            box-shadow .08s ease,
            filter .08s ease;
        }

        .canvas :global(.nc-3d-object:hover) {
          filter: brightness(1.02);
        }

        .selectionUi::after {
          content: "";
          position: absolute;
          inset: -4px;
          border: 1px solid rgba(255,255,255,.8);
          pointer-events: none;
        }

        .hint {
          margin: 8px 0 0;
          color: #53656f;
          font-size: 12px;
          font-weight: 700;
        }
      `}</style>
    </section>
  );
}
