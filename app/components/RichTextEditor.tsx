// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Button, Tooltip } from "@cloudflare/kumo";
import {
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
	LinkBreakIcon,
	LinkSimpleIcon,
	ListBulletsIcon,
	ListNumbersIcon,
	MinusIcon,
	QuotesIcon,
	TextBIcon,
	TextItalicIcon,
	TextStrikethroughIcon,
	TextUnderlineIcon,
} from "@phosphor-icons/react";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TiptapImage from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef, useState } from "react";

interface RichTextEditorProps {
	value: string;
	onChange: (value: string) => void;
	footerActions?: React.ReactNode;
	leftFooterActions?: React.ReactNode;
}

export default function RichTextEditor({
	value,
	onChange,
	footerActions,
	leftFooterActions,
}: RichTextEditorProps) {
	const editor = useEditor({
		extensions: [
			StarterKit,
			Underline,
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			LinkExtension.configure({ openOnClick: false }),
			TiptapImage,
			TextStyle,
			Color,
			Highlight.configure({ multicolor: true }),
		],
		content: value,
		editorProps: {
			attributes: {
				class:
					"prose prose-sm max-w-none focus:outline-none min-h-[180px] p-3 text-sm [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 [&_blockquote]:bg-slate-50 [&_blockquote]:py-1 [&_blockquote]:my-2 [&_blockquote]:text-xs [&_blockquote]:rounded-r-sm",
			},
		},
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
	});

	const [showFormatting, setShowFormatting] = useState(false);
	const popoverRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!showFormatting) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				setShowFormatting(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [showFormatting]);

	const handleFormat = useCallback((action: () => void) => {
		action();
		setShowFormatting(false);
	}, []);

	useEffect(() => {
		if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
			editor.commands.setContent(value);
			// Place cursor at the start of the document (above quoted text)
			const rafId = requestAnimationFrame(() => {
				if (!editor.isDestroyed) {
					editor.commands.focus('start');
				}
			});
			return () => cancelAnimationFrame(rafId);
		}
	}, [value, editor]);

	const setLink = useCallback(() => {
		if (!editor) return;
		const previousUrl = editor.getAttributes("link").href;
		const url = window.prompt("URL", previousUrl);
		if (url === null) {
			setShowFormatting(false);
			return;
		}
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			setShowFormatting(false);
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
		setShowFormatting(false);
	}, [editor]);

	if (!editor) return null;

	return (
		<div className="rounded-lg border border-slate-200 overflow-hidden flex flex-col bg-white focus-within:border-kumo-brand transition-colors w-full">
			{/* Editor content */}
			<div className="overflow-y-auto min-h-[120px] max-h-[400px]">
				<EditorContent editor={editor} />
			</div>

			{/* Toolbar at bottom */}
			<div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-2 py-1.5 border-t border-slate-200 shrink-0">
				<div className="flex items-center gap-0.5 flex-wrap relative" ref={popoverRef}>
					<Tooltip content="Formatting options" side="top" asChild>
						<Button
							variant={showFormatting ? "secondary" : "ghost"}
							shape="square"
							size="sm"
							onClick={() => setShowFormatting(!showFormatting)}
							aria-label="Formatting options"
						>
							<span className="font-bold font-serif tracking-tight text-[15px] leading-none">Aa</span>
						</Button>
					</Tooltip>

					{showFormatting && (
						<div className="absolute bottom-full left-0 mb-2 z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 flex flex-wrap items-center gap-0.5 w-[280px] animate-in fade-in zoom-in-95 duration-100">
							{/* Text formatting */}
							<Tooltip content="Heading 1" side="top" asChild>
								<Button
									variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
									shape="square"
									size="sm"
									onClick={() => handleFormat(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
									aria-label="Heading 1"
								>
									<span className="font-bold font-serif">H1</span>
								</Button>
							</Tooltip>
							<Tooltip content="Heading 2" side="top" asChild>
								<Button
									variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
									shape="square"
									size="sm"
									onClick={() => handleFormat(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
									aria-label="Heading 2"
								>
									<span className="font-bold font-serif text-sm">H2</span>
								</Button>
							</Tooltip>
							<div className="mx-1 h-5 w-px bg-slate-300" />
							<Tooltip content="Bold" side="top" asChild>
								<Button
									variant={editor.isActive("bold") ? "secondary" : "ghost"}
									shape="square"
									size="sm"
									icon={<TextBIcon size={16} />}
									onClick={() => handleFormat(() => editor.chain().focus().toggleBold().run())}
									aria-label="Bold"
								/>
							</Tooltip>
							<Tooltip content="Italic" side="top" asChild>
								<Button
									variant={editor.isActive("italic") ? "secondary" : "ghost"}
									shape="square"
									size="sm"
									icon={<TextItalicIcon size={16} />}
									onClick={() => handleFormat(() => editor.chain().focus().toggleItalic().run())}
									aria-label="Italic"
								/>
							</Tooltip>
							<Tooltip content="Underline" side="top" asChild>
								<Button
									variant={editor.isActive("underline") ? "secondary" : "ghost"}
									shape="square"
									size="sm"
									icon={<TextUnderlineIcon size={16} />}
									onClick={() => handleFormat(() => editor.chain().focus().toggleUnderline().run())}
									aria-label="Underline"
								/>
							</Tooltip>
							<Tooltip content="Strikethrough" side="top" asChild>
								<Button
									variant={editor.isActive("strike") ? "secondary" : "ghost"}
									shape="square"
									size="sm"
									icon={<TextStrikethroughIcon size={16} />}
									onClick={() => handleFormat(() => editor.chain().focus().toggleStrike().run())}
									aria-label="Strikethrough"
								/>
							</Tooltip>

							<div className="mx-1 h-5 w-px bg-slate-300" />

							{/* Lists */}
							<Tooltip content="Bullet list" side="top" asChild>
								<Button
									variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
									shape="square"
									size="sm"
									icon={<ListBulletsIcon size={16} />}
									onClick={() => handleFormat(() => editor.chain().focus().toggleBulletList().run())}
									aria-label="Bullet list"
								/>
							</Tooltip>
							<Tooltip content="Numbered list" side="top" asChild>
								<Button
									variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
									shape="square"
									size="sm"
									icon={<ListNumbersIcon size={16} />}
									onClick={() => handleFormat(() => editor.chain().focus().toggleOrderedList().run())}
									aria-label="Numbered list"
								/>
							</Tooltip>

							<div className="mx-1 h-5 w-px bg-slate-300" />

							{/* Block formatting */}
							<Tooltip content="Blockquote" side="top" asChild>
								<Button
									variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
									shape="square"
									size="sm"
									icon={<QuotesIcon size={16} />}
									onClick={() => handleFormat(() => editor.chain().focus().toggleBlockquote().run())}
									aria-label="Blockquote"
								/>
							</Tooltip>
							<Tooltip content="Link" side="top" asChild>
								<Button
									variant={editor.isActive("link") ? "secondary" : "ghost"}
									shape="square"
									size="sm"
									icon={<LinkSimpleIcon size={16} />}
									onClick={() => handleFormat(setLink)}
									aria-label="Link"
								/>
							</Tooltip>
							{editor.isActive("link") && (
								<Tooltip content="Remove link" side="top" asChild>
									<Button
										variant="ghost"
										shape="square"
										size="sm"
										icon={<LinkBreakIcon size={16} />}
										onClick={() => handleFormat(() => editor.chain().focus().unsetLink().run())}
										aria-label="Remove link"
									/>
								</Tooltip>
							)}
							<Tooltip content="Horizontal rule" side="top" asChild>
								<Button
									variant="ghost"
									shape="square"
									size="sm"
									icon={<MinusIcon size={16} />}
									onClick={() => handleFormat(() => editor.chain().focus().setHorizontalRule().run())}
									aria-label="Horizontal rule"
								/>
							</Tooltip>

							<div className="mx-1 h-5 w-px bg-slate-300" />

							{/* Undo/Redo */}
							<Tooltip content="Undo" side="top" asChild>
								<Button
									variant="ghost"
									shape="square"
									size="sm"
									icon={<ArrowCounterClockwiseIcon size={16} />}
									onClick={() => handleFormat(() => editor.chain().focus().undo().run())}
									disabled={!editor.can().undo()}
									aria-label="Undo"
								/>
							</Tooltip>
							<Tooltip content="Redo" side="top" asChild>
								<Button
									variant="ghost"
									shape="square"
									size="sm"
									icon={<ArrowClockwiseIcon size={16} />}
									onClick={() => handleFormat(() => editor.chain().focus().redo().run())}
									disabled={!editor.can().redo()}
									aria-label="Redo"
								/>
							</Tooltip>
						</div>
					)}
					{leftFooterActions && (
						<div className="flex items-center ml-1">
							{leftFooterActions}
						</div>
					)}
				</div>
				
				{footerActions && (
					<div className="flex items-center gap-2">
						{footerActions}
					</div>
				)}
			</div>
		</div>
	);
}
