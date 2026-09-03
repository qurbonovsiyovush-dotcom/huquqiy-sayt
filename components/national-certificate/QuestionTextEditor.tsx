"use client";

import {
  useEffect,
  useRef,
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

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
    }
  }, [
    valueHtml,
    fallbackText,
  ]);

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
      </div>

      <div
        ref={ref}
        className="editor"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
      />

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
      `}</style>
    </div>
  );
}

