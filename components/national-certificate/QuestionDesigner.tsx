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

  const [selectedId, setSelectedId] =
    useState<string>("");

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

        width = Math.max(
          40,
          width
        );

        height = Math.max(
          30,
          height
        );

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

  function applyObjectStyle() {
    const node =
      selectedObject();

    if (!node) return;

    node.style.backgroundColor =
      fill;

    node.style.borderColor =
      stroke;

    node.style.borderWidth = `${strokeWidth}px`;

    node.style.borderStyle =
      "solid";

    emit();
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

    insertHtml(
      `<div class="nc-object" data-object-id="${id}" data-kind="${kind}" contenteditable="${
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
      }px;border:${strokeWidth}px solid ${stroke};border-radius:${radius};background:${fill};font-weight:700;text-align:center;box-sizing:border-box;">${text}</div><p><br></p>`
    );
  }

  function insertVenn2() {
    const id = uid();

    insertHtml(
      `<div class="nc-venn nc-object" data-object-id="${id}" data-kind="venn2" contenteditable="true" style="position:relative;width:720px;max-width:96%;height:390px;margin:22px auto;padding:0;border:0;background:#fff;box-sizing:border-box;">
        <div style="position:absolute;left:40px;top:8px;width:280px;text-align:center;font-weight:700;">I — Chap to‘plamga xos</div>
        <div style="position:absolute;right:40px;top:8px;width:280px;text-align:center;font-weight:700;">II — O‘ng to‘plamga xos</div>
        <div style="position:absolute;left:110px;top:75px;width:330px;height:235px;border:3px solid #263b46;border-radius:50%;background:#fff;"></div>
        <div style="position:absolute;right:110px;top:75px;width:330px;height:235px;border:3px solid #263b46;border-radius:50%;background:#fff;"></div>
        <div style="position:absolute;left:305px;top:78px;width:110px;height:229px;border-radius:48%;background:rgba(67,168,216,.38);pointer-events:none;"></div>
        <div style="position:absolute;left:195px;top:175px;font-size:24px;font-weight:800;">I</div>
        <div style="position:absolute;right:195px;top:175px;font-size:24px;font-weight:800;">II</div>
        <div style="position:absolute;left:50%;transform:translateX(-50%);top:175px;font-size:24px;font-weight:900;">III</div>
        <div style="position:absolute;left:50%;transform:translateX(-50%);bottom:5px;width:330px;text-align:center;font-weight:700;">III — har ikkalasiga xos</div>
      </div><p><br></p>`
    );
  }

  function insertVenn3() {
    const id = uid();

    insertHtml(
      `<div class="nc-venn nc-object" data-object-id="${id}" data-kind="venn3" contenteditable="true" style="position:relative;width:720px;max-width:96%;height:470px;margin:22px auto;border:0;background:#fff;">
        <div style="position:absolute;left:65px;top:75px;width:330px;height:245px;border:3px solid #263b46;border-radius:50%;background:rgba(77,176,225,.12);"></div>
        <div style="position:absolute;right:65px;top:75px;width:330px;height:245px;border:3px solid #263b46;border-radius:50%;background:rgba(85,204,155,.12);"></div>
        <div style="position:absolute;left:195px;top:185px;width:330px;height:245px;border:3px solid #263b46;border-radius:50%;background:rgba(241,187,74,.12);"></div>
        <div style="position:absolute;left:90px;top:28px;font-weight:800;">A to‘plam</div>
        <div style="position:absolute;right:90px;top:28px;font-weight:800;">B to‘plam</div>
        <div style="position:absolute;left:50%;transform:translateX(-50%);bottom:2px;font-weight:800;">C to‘plam</div>
        <div style="position:absolute;left:150px;top:170px;font-weight:800;">I</div>
        <div style="position:absolute;right:150px;top:170px;font-weight:800;">II</div>
        <div style="position:absolute;left:50%;transform:translateX(-50%);top:345px;font-weight:800;">III</div>
        <div style="position:absolute;left:50%;transform:translateX(-50%);top:145px;font-weight:800;">IV</div>
        <div style="position:absolute;left:255px;top:270px;font-weight:800;">V</div>
        <div style="position:absolute;right:255px;top:270px;font-weight:800;">VI</div>
        <div style="position:absolute;left:50%;transform:translateX(-50%);top:235px;font-weight:900;">VII</div>
      </div><p><br></p>`
    );
  }

  function insertTable() {
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
      `<div class="nc-table-wrap" style="overflow-x:auto;margin:16px 0;"><table style="width:100%;border-collapse:collapse;background:#fff;">${body}</table></div><p><br></p>`
    );
  }

  function insertManualTable() {
    const id = uid();

    insertHtml(
      `<div class="nc-object" data-object-id="${id}" data-kind="manual-table" contenteditable="true" style="position:relative;width:620px;max-width:96%;height:280px;margin:18px auto;border:2px dashed #6c7d86;background:#fff;">
        <div style="position:absolute;left:0;right:0;top:33%;border-top:2px solid #263b46;"></div>
        <div style="position:absolute;left:0;right:0;top:66%;border-top:2px solid #263b46;"></div>
        <div style="position:absolute;top:0;bottom:0;left:33%;border-left:2px solid #263b46;"></div>
        <div style="position:absolute;top:0;bottom:0;left:66%;border-left:2px solid #263b46;"></div>
        <div style="padding:12px;font-weight:700;">Qo‘lda jadval: chiziqlarni tanlab o‘zgartiring yoki yangi chiziq qo‘shing.</div>
      </div><p><br></p>`
    );
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

  function onEditorClick(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    const target =
      event.target as HTMLElement;

    const object =
      target.closest(
        "[data-object-id]"
      ) as HTMLElement | null;

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

    const parent =
      node.offsetParent as HTMLElement | null;

    if (
      !parent ||
      node.style.position !==
        "absolute"
    ) {
      node.style.position =
        "absolute";

      node.style.left = `${node.offsetLeft}px`;
      node.style.top = `${node.offsetTop}px`;
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

    if (
      node.style.position !==
        "absolute"
    ) {
      node.style.position =
        "absolute";

      node.style.left = `${node.offsetLeft}px`;
      node.style.top = `${node.offsetTop}px`;
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
        `<div class="nc-object nc-image-object" data-object-id="${id}" data-kind="image" contenteditable="false" style="position:relative;width:420px;height:280px;max-width:96%;margin:18px auto;border:2px solid #263b46;background:#fff;overflow:hidden;"><img src="${String(
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
            onChange={(e) =>
              setFill(
                e.target.value
              )
            }
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
            onChange={(e) =>
              setStroke(
                e.target.value
              )
            }
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
            onChange={(e) =>
              setStrokeWidth(
                Number(
                  e.target.value
                ) || 0
              )
            }
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
          onPaste={() =>
            setTimeout(
              emit,
              0
            )
          }
        />

        {selectedId && (
          <div
            className="selectionUi"
            data-nc-ui="true"
          >
            <button
              type="button"
              className="moveHandle"
              onPointerDown={
                startDrag
              }
              title="Sudrash"
            >
              ✥
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
        ✥ bilan sudrang,
        atrofigidagi 8 ta
        nuqtadan tortib
        o‘lchamini o‘zgartiring.
        Rasm, shakl va Venn
        elementlari ham shu
        usulda ishlaydi.
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

        .canvas :global(.nc-selected) {
          outline: 2px dashed #058bd6 !important;
          outline-offset: 3px;
        }

        .selectionUi {
          position: absolute;
          inset: 14px;
          pointer-events: none;
        }

        .moveHandle {
          position: absolute;
          right: 8px;
          top: 8px;
          z-index: 1000;
          width: 38px;
          height: 38px;
          border: 2px solid #064f7c;
          border-radius: 8px;
          background: #45bce9;
          color: #fff;
          font-size: 20px;
          font-weight: 900;
          pointer-events: auto;
          cursor: move;
        }

        .resizeHandle {
          position: absolute;
          z-index: 1000;
          width: 12px;
          height: 12px;
          padding: 0;
          border: 2px solid #064f7c;
          border-radius: 2px;
          background: #fff;
          pointer-events: auto;
        }

        .resizeHandle.nw {
          left: 2px;
          top: 2px;
          cursor: nwse-resize;
        }

        .resizeHandle.n {
          left: 50%;
          top: 2px;
          transform: translateX(-50%);
          cursor: ns-resize;
        }

        .resizeHandle.ne {
          right: 2px;
          top: 2px;
          cursor: nesw-resize;
        }

        .resizeHandle.e {
          right: 2px;
          top: 50%;
          transform: translateY(-50%);
          cursor: ew-resize;
        }

        .resizeHandle.se {
          right: 2px;
          bottom: 2px;
          cursor: nwse-resize;
        }

        .resizeHandle.s {
          left: 50%;
          bottom: 2px;
          transform: translateX(-50%);
          cursor: ns-resize;
        }

        .resizeHandle.sw {
          left: 2px;
          bottom: 2px;
          cursor: nesw-resize;
        }

        .resizeHandle.w {
          left: 2px;
          top: 50%;
          transform: translateY(-50%);
          cursor: ew-resize;
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

