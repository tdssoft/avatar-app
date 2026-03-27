import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  RemoveFormatting,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const COLOR_PALETTE = [
  { label: "Domyślny", value: "#1a1a1a" },
  { label: "Cyjan", value: "#00b8d4" },
  { label: "Limonka", value: "#8bc34a" },
  { label: "Czerwony", value: "#e53935" },
  { label: "Pomarańczowy", value: "#fb8c00" },
  { label: "Żółty", value: "#fdd835" },
  { label: "Zielony", value: "#43a047" },
  { label: "Niebieski", value: "#1e88e5" },
  { label: "Fioletowy", value: "#8e24aa" },
  { label: "Różowy", value: "#e91e63" },
  { label: "Szary", value: "#757575" },
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

interface ToolbarProps {
  editor: Editor | null;
}

function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
      {/* Formatowanie tekstu */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Pogrubienie"
        title="Pogrubienie (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Kursywa"
        title="Kursywa (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Podkreślenie"
        title="Podkreślenie (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Nagłówki */}
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 1 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        aria-label="Nagłówek 1"
        title="Nagłówek 1"
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        aria-label="Nagłówek 2"
        title="Nagłówek 2"
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Listy */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Lista punktowana"
        title="Lista punktowana"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Lista numerowana"
        title="Lista numerowana"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Historia */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        aria-label="Cofnij"
        title="Cofnij (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        aria-label="Ponów"
        title="Ponów (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Kolory tekstu */}
      <div className="flex flex-wrap items-center gap-1">
        {COLOR_PALETTE.map((color) => (
          <button
            key={color.value}
            type="button"
            title={color.label}
            aria-label={`Kolor: ${color.label}`}
            onClick={() => {
              if (color.value === "#1a1a1a") {
                editor.chain().focus().unsetColor().run();
              } else {
                editor.chain().focus().setColor(color.value).run();
              }
            }}
            className={cn(
              "h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
              editor.isActive("textStyle", { color: color.value })
                ? "border-foreground scale-110"
                : "border-transparent"
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().unsetColor().run()}
          aria-label="Usuń kolor"
          title="Usuń kolor tekstu"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "200px",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Color, Underline],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "px-3 py-2",
        "data-placeholder": placeholder ?? "",
      },
    },
  });

  // Sync zewnętrznych zmian value (np. ładowanie danych w trybie edycji)
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-md border border-input bg-background ring-offset-background",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
    >
      <Toolbar editor={editor} />
      <Separator />
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="flex-1 overflow-y-auto"
      />
    </div>
  );
}
