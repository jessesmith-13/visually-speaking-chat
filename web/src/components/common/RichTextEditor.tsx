import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Label } from "@/ui/label";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";
import { useEffect, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  label,
  placeholder = "Enter description...",
  required = false,
}: RichTextEditorProps) {
  // Force re-render when editor state changes
  const [, forceUpdate] = useState({});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "tiptap-editor min-h-[200px] max-h-[400px] overflow-y-auto px-3 py-2 focus:outline-none bg-white dark:bg-gray-950",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      forceUpdate({}); // Force toolbar re-render
    },
    onSelectionUpdate: () => {
      forceUpdate({}); // Force toolbar re-render when selection changes
    },
    onTransaction: () => {
      forceUpdate({}); // Force toolbar re-render on any transaction
    },
  });

  // Sync external value changes with editor
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="border rounded-md overflow-hidden bg-white dark:bg-gray-950">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-900 border-b">
          {/* Headings */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleHeading({ level: 1 }).run();
            }}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("heading", { level: 1 })
                ? "bg-gray-300 dark:bg-gray-600"
                : ""
            }`}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            }}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("heading", { level: 2 })
                ? "bg-gray-300 dark:bg-gray-600"
                : ""
            }`}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleHeading({ level: 3 }).run();
            }}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("heading", { level: 3 })
                ? "bg-gray-300 dark:bg-gray-600"
                : ""
            }`}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </button>

          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Text formatting */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleBold().run();
            }}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("bold") ? "bg-gray-300 dark:bg-gray-600" : ""
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleItalic().run();
            }}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("italic") ? "bg-gray-300 dark:bg-gray-600" : ""
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleStrike().run();
            }}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("strike") ? "bg-gray-300 dark:bg-gray-600" : ""
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </button>

          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              console.log("Bullet list clicked");
              console.log(
                "Can toggle bullet list:",
                editor.can().toggleBulletList(),
              );
              const result = editor.chain().focus().toggleBulletList().run();
              console.log("Toggle result:", result);
              console.log("Is active:", editor.isActive("bulletList"));
              console.log("HTML:", editor.getHTML());
            }}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("bulletList")
                ? "bg-gray-300 dark:bg-gray-600"
                : ""
            }`}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              console.log("Ordered list clicked");
              console.log(
                "Can toggle ordered list:",
                editor.can().toggleOrderedList(),
              );
              const result = editor.chain().focus().toggleOrderedList().run();
              console.log("Toggle result:", result);
              console.log("Is active:", editor.isActive("orderedList"));
              console.log("HTML:", editor.getHTML());
            }}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("orderedList")
                ? "bg-gray-300 dark:bg-gray-600"
                : ""
            }`}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
