"use client";

// product description editor: "description
// uses a rich text editor (Lexical). Simple-tier stays a plain textarea."
//
// Stores/emits HTML via @lexical/html. The backend must still sanitize
// this before persisting/rendering real brand input once a database
// exists — this component only handles the editing UI.

import { useEffect } from "react";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  EditorState,
  FORMAT_TEXT_COMMAND,
  LexicalEditor,
} from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { $createHeadingNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { useLanguage } from "@/lib/i18n";
import {
  MdFormatBold,
  MdFormatItalic,
  MdFormatUnderlined,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdTitle,
  MdSubject,
} from "react-icons/md";

interface RichTextEditorProps {
  initialHtml: string;
  onChangeHtml: (html: string) => void;
  placeholder?: string;
}

function InitialContentPlugin({ initialHtml }: { initialHtml: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!initialHtml) return;
    editor.update(() => {
      const dom = new DOMParser().parseFromString(initialHtml, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      // append(), not select() + $insertNodes() — select() puts native
      // DOM focus/selection on this editor's contentEditable, which the
      // browser then auto-scrolls into view. Harmless with a single editor
      // on the page, but the Products tab mounts one RichTextEditor per
      // Rich product's MN+EN description — with several on screen at once,
      // whichever mounts last silently stole focus and yanked the page's
      // scroll position to it. append() seeds the same content without
      // touching selection at all.
      root.append(...nodes);
      // "history-merge": OnChangePlugin ignores updates with this tag by
      // default, so seeding the saved text doesn't report a change — the
      // form would otherwise show "unsaved changes" the moment it opens.
      // It also keeps the seed out of the undo history.
    }, { tag: "history-merge" });
    // Only seed once, on mount — further edits flow through onChange, not back in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return null;
}

// Font-style controls a brand manager actually sees. Bold/italic/underline
// also work via keyboard shortcuts already (Lexical's RichTextPlugin wires
// those up automatically) — this makes the same commands discoverable.
function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const { t } = useLanguage();

  function format(style: "bold" | "italic" | "underline") {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, style);
  }

  function toggleHeading() {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode("h2"));
      }
    });
  }

  function toggleParagraph() {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  }

  const buttonClass =
    "flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition hover:bg-surface hover:text-fg hover:shadow-xs";

  return (
    <div role="toolbar" aria-label={t("editor.toolbar")} className="flex flex-wrap items-center gap-0.5 border-b border-line bg-subtle/60 p-1">
      <button type="button" title={t("editor.bold")} aria-label={t("editor.bold")} onMouseDown={(e) => e.preventDefault()} onClick={() => format("bold")} className={buttonClass}>
        <MdFormatBold size={18} />
      </button>
      <button type="button" title={t("editor.italic")} aria-label={t("editor.italic")} onMouseDown={(e) => e.preventDefault()} onClick={() => format("italic")} className={buttonClass}>
        <MdFormatItalic size={18} />
      </button>
      <button type="button" title={t("editor.underline")} aria-label={t("editor.underline")} onMouseDown={(e) => e.preventDefault()} onClick={() => format("underline")} className={buttonClass}>
        <MdFormatUnderlined size={18} />
      </button>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
      <button type="button" title={t("editor.heading")} aria-label={t("editor.heading")} onMouseDown={(e) => e.preventDefault()} onClick={toggleHeading} className={buttonClass}>
        <MdTitle size={18} />
      </button>
      <button type="button" title={t("editor.paragraph")} aria-label={t("editor.paragraph")} onMouseDown={(e) => e.preventDefault()} onClick={toggleParagraph} className={buttonClass}>
        <MdSubject size={18} />
      </button>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
      <button
        type="button"
        title={t("editor.bullets")} aria-label={t("editor.bullets")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        className={buttonClass}
      >
        <MdFormatListBulleted size={18} />
      </button>
      <button
        type="button"
        title={t("editor.numbered")} aria-label={t("editor.numbered")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        className={buttonClass}
      >
        <MdFormatListNumbered size={18} />
      </button>
    </div>
  );
}

export default function RichTextEditor({
  initialHtml,
  onChangeHtml,
  placeholder,
}: RichTextEditorProps) {
  const initialConfig = {
    namespace: "veramed-rich-text",
    nodes: [ListNode, ListItemNode, LinkNode, HeadingNode, QuoteNode],
    onError(error: Error) {
      // eslint-disable-next-line no-console
      console.error("Lexical error:", error);
    },
    theme: {
      list: { ul: "list-disc pl-5", ol: "list-decimal pl-5" },
      link: "text-brand-600 underline",
      text: { bold: "font-semibold", italic: "italic" },
      heading: { h1: "text-xl font-bold", h2: "text-lg font-bold" },
    },
  };

  function handleChange(editorState: EditorState, editor: LexicalEditor) {
    editorState.read(() => {
      onChangeHtml($generateHtmlFromNodes(editor, null));
    });
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs transition-[border-color,box-shadow] focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
        <Toolbar />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="prose prose-sm min-h-[180px] max-w-none px-3.5 py-3 text-fg focus:outline-none" />
            }
            placeholder={
              <div className="pointer-events-none absolute left-3.5 top-3 text-sm text-fg-faint">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <InitialContentPlugin initialHtml={initialHtml} />
        <OnChangePlugin onChange={handleChange} />
      </div>
    </LexicalComposer>
  );
}
