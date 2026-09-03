"use client";

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Props = {
  valueHtml: string;
  fallbackText: string;
  onChange: (
    plainText: string,
    html: string
  ) => void;
  disabled?: boolean;
};

type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
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

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function px(value: string) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number)
    ? number
    : 0;
}

export default function QuestionTextEditor({
  valueHtml,
  fallbackText,
  onChange,
  disabled = false,
}: Props) {
  const ref =
    useRef<HTMLDivElement | null>(
      null
    );

  const selectedImageRef =
    useRef<HTMLImageElement | null>(
      null
    );

  const [selectedImage, setSelectedImage] =
    useState<HTMLImageElement | null>(
      null
    );

  const [selectionBox, setSelectionBox] =
    useState<Box | null>(null);

  const [keepRatio, setKeepRatio] =
    useState(true);

  const syncSelection =
    useCallback(() => {
      const img =
        selectedImageRef.current;

      if (
        !img ||
        !img.isConnected
      ) {
        setSelectionBox(null);
        return;
      }

      const rect =
        img.getBoundingClientRect();

      setSelectionBox({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }, []);

  function emit() {
    const root = ref.current;
    if (!root) return;

    onChange(
      (root.innerText || "")
        .replace(/\u00a0/g, " ")
        .trim(),
      root.innerHTML
    );
  }

  function selectImage(
    img: HTMLImageElement | null
  ) {
    selectedImageRef.current =
      img;

    setSelectedImage(img);

    if (!img) {
      setSelectionBox(null);
      return;
    }

    requestAnimationFrame(
      syncSelection
    );
  }

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const incoming =
      valueHtml ||
      `<div>${escapeHtml(
        fallbackText
      ).replace(
        /\n/g,
        "<br>"
      )}</div>`;

    if (
      root.innerHTML !==
      incoming
    ) {
      root.innerHTML =
        incoming;

      root
        .querySelectorAll("img")
        .forEach((node) => {
          const img =
            node as HTMLImageElement;

          if (
            !img.style.maxWidth
          ) {
            img.style.maxWidth =
              "100%";
          }

          if (
            !img.style.height &&
            !img.getAttribute(
              "height"
            )
          ) {
            img.style.height =
              "auto";
          }

          img.style.cursor =
            "pointer";
        });
    }

    selectImage(null);
  }, [
    valueHtml,
    fallbackText,
  ]);

  useEffect(() => {
    const handle = () =>
      syncSelection();

    window.addEventListener(
      "resize",
      handle
    );

    window.addEventListener(
      "scroll",
      handle,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        handle
      );

      window.removeEventListener(
        "scroll",
        handle,
        true
      );
    };
  }, [syncSelection]);

  function cmd(
    name: string,
    value?: string
  ) {
    if (disabled) return;

    ref.current?.focus();

    document.execCommand(
      name,
      false,
      value
    );

    emit();
  }

  function startResize(
    event: ReactPointerEvent<
      HTMLButtonElement
    >,
    handle: Handle
  ) {
    if (disabled) return;

    const img =
      selectedImageRef.current;

    if (!img) return;

    event.preventDefault();
    event.stopPropagation();

    const startX =
      event.clientX;
    const startY =
      event.clientY;

    const rect =
      img.getBoundingClientRect();

    const computed =
      window.getComputedStyle(
        img
      );

    const startWidth =
      rect.width;

    const startHeight =
      rect.height;

    const aspect =
      startWidth /
      Math.max(
        startHeight,
        1
      );

    const minWidth = 24;
    const minHeight = 24;

    // Explicit pixel size is important,
    // otherwise max-width / auto height can
    // fight against the resize operation.
    img.style.width = `${startWidth}px`;
    img.style.height = `${startHeight}px`;
    img.style.maxWidth = "none";
    img.style.objectFit =
      computed.objectFit ===
      "fill"
        ? "fill"
        : "contain";

    function onMove(
      moveEvent: PointerEvent
    ) {
      const dx =
        moveEvent.clientX -
        startX;

      const dy =
        moveEvent.clientY -
        startY;

      let width =
        startWidth;

      let height =
        startHeight;

      if (
        handle.includes("e")
      ) {
        width =
          startWidth + dx;
      }

      if (
        handle.includes("w")
      ) {
        width =
          startWidth - dx;
      }

      if (
        handle.includes("s")
      ) {
        height =
          startHeight + dy;
      }

      if (
        handle.includes("n")
      ) {
        height =
          startHeight - dy;
      }

      const isCorner =
        handle.length === 2;

      if (
        keepRatio &&
        isCorner
      ) {
        const widthDelta =
          Math.abs(
            width -
              startWidth
          );

        const heightDelta =
          Math.abs(
            height -
              startHeight
          );

        if (
          widthDelta >=
          heightDelta
        ) {
          width =
            Math.max(
              minWidth,
              width
            );

          height =
            width /
            aspect;
        } else {
          height =
            Math.max(
              minHeight,
              height
            );

          width =
            height *
            aspect;
        }
      }

      width =
        Math.max(
          minWidth,
          width
        );

      height =
        Math.max(
          minHeight,
          height
        );

      img.style.width = `${Math.round(
        width
      )}px`;

      img.style.height = `${Math.round(
        height
      )}px`;

      syncSelection();
    }

    function onUp() {
      window.removeEventListener(
        "pointermove",
        onMove
      );

      window.removeEventListener(
        "pointerup",
        onUp
      );

      syncSelection();
      emit();
    }

    window.addEventListener(
      "pointermove",
      onMove
    );

    window.addEventListener(
      "pointerup",
      onUp,
      { once: true }
    );
  }

  function deleteImage() {
    const img =
      selectedImageRef.current;

    if (!img || disabled)
      return;

    img.remove();
    selectImage(null);
    emit();
  }

  return (
    <div className="questionTextEditor">
      <div className="toolbar">
        <button
          type="button"
          onClick={() =>
            cmd("undo")
          }
          disabled={disabled}
        >
          ↶
        </button>

        <button
          type="button"
          onClick={() =>
            cmd("redo")
          }
          disabled={disabled}
        >
          ↷
        </button>

        <select
          defaultValue="Bell MT"
          onChange={(e) =>
            cmd(
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
            Times New Roman
          </option>
          <option>
            Arial
          </option>
        </select>

        <select
          defaultValue="4"
          onChange={(e) =>
            cmd(
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
            cmd("bold")
          }
          disabled={disabled}
        >
          <b>B</b>
        </button>

        <button
          type="button"
          onClick={() =>
            cmd("italic")
          }
          disabled={disabled}
        >
          <i>I</i>
        </button>

        <button
          type="button"
          onClick={() =>
            cmd("underline")
          }
          disabled={disabled}
        >
          <u>U</u>
        </button>

        <button
          type="button"
          onClick={() =>
            cmd(
              "strikeThrough"
            )
          }
          disabled={disabled}
        >
          <s>S</s>
        </button>

        <label>
          A
          <input
            type="color"
            onChange={(e) =>
              cmd(
                "foreColor",
                e.target.value
              )
            }
            disabled={disabled}
          />
        </label>

        <label>
          ▰
          <input
            type="color"
            onChange={(e) =>
              cmd(
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
            cmd(
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
            cmd(
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
            cmd(
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
            cmd(
              "justifyFull"
            )
          }
          disabled={disabled}
        >
          ☰
        </button>

        <button
          type="button"
          onClick={() =>
            cmd(
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
            cmd(
              "insertOrderedList"
            )
          }
          disabled={disabled}
        >
          1. List
        </button>

        {selectedImage && (
          <label
            className="ratioTool"
            title="Rasm nisbatini saqlash"
          >
            <input
              type="checkbox"
              checked={keepRatio}
              onChange={(e) =>
                setKeepRatio(
                  e.target.checked
                )
              }
              disabled={disabled}
            />
            Rasm nisbati
          </label>
        )}
      </div>

      <div
        ref={ref}
        className="editor"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onClick={(event) => {
          const target =
            event.target as HTMLElement;

          if (
            target.tagName ===
            "IMG"
          ) {
            selectImage(
              target as HTMLImageElement
            );
            return;
          }

          selectImage(null);
        }}
      />

      {selectedImage &&
        selectionBox && (
          <div
            className="imageSelection"
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
            aria-hidden="true"
          >
            {(
              [
                "nw",
                "n",
                "ne",
                "e",
                "se",
                "s",
                "sw",
                "w",
              ] as Handle[]
            ).map(
              (handle) => (
                <button
                  key={handle}
                  type="button"
                  className={`resizeHandle h-${handle}`}
                  onPointerDown={(
                    event
                  ) =>
                    startResize(
                      event,
                      handle
                    )
                  }
                  tabIndex={-1}
                />
              )
            )}

            <button
              type="button"
              className="imageDelete"
              onPointerDown={(
                event
              ) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={
                deleteImage
              }
              tabIndex={-1}
              title="Rasmni o‘chirish"
            >
              ×
            </button>
          </div>
        )}

      <style jsx>{`
        .questionTextEditor {
          width: 100%;
        }

        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px;
          border: 2px solid #506873;
          border-bottom: 0;
          border-radius: 10px 10px 0 0;
          background: linear-gradient(
            180deg,
            #f7fafb,
            #ccd8de
          );
          box-shadow:
            inset 0 3px 2px #fff;
        }

        button,
        select,
        label {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0 9px;
          border: 1.5px solid #516975;
          border-radius: 6px;
          background: linear-gradient(
            180deg,
            #fff,
            #d7e0e5
          );
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-weight: 800;
        }

        button {
          cursor: pointer;
        }

        input[type="color"] {
          width: 25px;
          height: 24px;
          padding: 0;
          border: 0;
          background: transparent;
        }

        .ratioTool {
          user-select: none;
        }

        .ratioTool input {
          width: 16px;
          height: 16px;
        }

        .editor {
          min-height: 160px;
          padding: 16px 18px;
          border: 2px solid #506873;
          border-radius: 0 0 10px 10px;
          outline: none;
          background: #fff;
          font-family:
            "Bell MT",
            Georgia,
            "Times New Roman",
            serif;
          font-size: 20px;
          line-height: 1.5;
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        .editor:focus {
          border-color: #078fd5;
          box-shadow:
            0 0 0 3px
            rgba(0, 151, 222, .17);
        }

        .editor :global(img) {
          display: inline-block;
          max-width: 100%;
          height: auto;
          cursor: pointer;
          user-select: none;
          vertical-align: middle;
        }

        .imageSelection {
          position: fixed;
          z-index: 100000;
          pointer-events: none;
          border: 2px dashed #0797dc;
          box-sizing: border-box;
        }

        .resizeHandle {
          position: absolute;
          width: 12px;
          height: 12px;
          min-height: 0;
          padding: 0;
          border: 2px solid #087db4;
          border-radius: 2px;
          background: #eaf9ff;
          box-shadow:
            0 1px 2px
            rgba(0, 0, 0, .25);
          pointer-events: auto;
          z-index: 3;
        }

        .h-nw {
          left: -7px;
          top: -7px;
          cursor: nwse-resize;
        }

        .h-n {
          left: 50%;
          top: -7px;
          transform: translateX(-50%);
          cursor: ns-resize;
        }

        .h-ne {
          right: -7px;
          top: -7px;
          cursor: nesw-resize;
        }

        .h-e {
          right: -7px;
          top: 50%;
          transform: translateY(-50%);
          cursor: ew-resize;
        }

        .h-se {
          right: -7px;
          bottom: -7px;
          cursor: nwse-resize;
        }

        .h-s {
          left: 50%;
          bottom: -7px;
          transform: translateX(-50%);
          cursor: ns-resize;
        }

        .h-sw {
          left: -7px;
          bottom: -7px;
          cursor: nesw-resize;
        }

        .h-w {
          left: -7px;
          top: 50%;
          transform: translateY(-50%);
          cursor: ew-resize;
        }

        .imageDelete {
          position: absolute;
          right: -18px;
          top: -19px;
          width: 28px;
          height: 28px;
          min-height: 0;
          padding: 0;
          display: grid;
          place-items: center;
          border: 2px solid #a80808;
          border-radius: 50%;
          background: linear-gradient(
            180deg,
            #ff5b5b,
            #d90909
          );
          color: #fff;
          font-size: 21px;
          font-weight: 900;
          line-height: 1;
          box-shadow:
            inset 0 2px 2px
            rgba(255,255,255,.55),
            0 3px 5px
            rgba(0,0,0,.3);
          pointer-events: auto;
          cursor: pointer;
          z-index: 4;
        }
      `}</style>
    </div>
  );
}
