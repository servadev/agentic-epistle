// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Banner, Button, Input, Tooltip } from "@cloudflare/kumo";
import { EnvelopeSimpleIcon, FloppyDiskIcon, PaperPlaneTiltIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useParams } from "react-router";
import { useComposeForm } from "~/hooks/useComposeForm";
import RichTextEditor from "./RichTextEditor";
import type { Email } from "~/types";
import { useState, useRef, useEffect } from "react";

export default function ComposePanel({ defaultReplyEmail }: { defaultReplyEmail?: Email }) {
	const { mailboxId, folder } = useParams<{
		mailboxId: string;
		folder: string;
	}>();

	const [showCcBccPopover, setShowCcBccPopover] = useState(false);
	const popoverRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!showCcBccPopover) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				setShowCcBccPopover(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [showCcBccPopover]);

	const {
		to,
		setTo,
		cc,
		setCc,
		bcc,
		setBcc,
		showCc,
		setShowCc,
		showBcc,
		setShowBcc,
		subject,
		setSubject,
		body,
		setBody,
		error,
		isSavingDraft,
		isSending,
		handleSaveDraft,
		handleSend,
		closePanel,
		mode,
	} = useComposeForm(mailboxId, folder, defaultReplyEmail);

	// Safe to use mailboxId directly as the From address for now
	const fromAddress = mailboxId || "";

	const showToAndSubject = mode === "forward" || mode === "new";

	return (
		<div className="flex flex-col w-full bg-white px-4 py-3 md:px-6">
			<form
				onSubmit={(e) => handleSend(e, closePanel)}
				className="flex flex-col gap-3"
			>
				{error && <Banner variant="error" text={error} />}

				{/* Metadata fields (compact) */}
				{showToAndSubject && (
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider w-12 shrink-0">
								To
							</label>
							<div className="flex-1 flex items-center gap-2 min-w-0">
								<Input
									type="text"
									placeholder="recipient@example.com"
									size="sm"
									value={to}
									onChange={(e) => setTo(e.target.value)}
									required
								/>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider w-12 shrink-0">
								Subj
							</label>
							<div className="flex-1">
								<Input
									type="text"
									placeholder="Email subject"
									size="sm"
									value={subject}
									onChange={(e) => setSubject(e.target.value)}
									required
								/>
							</div>
						</div>
					</div>
				)}

				{showCc && (
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider w-12 shrink-0">
								CC
							</label>
							<div className="flex-1">
								<Input
									type="text"
									size="sm"
									value={cc}
									onChange={(e) => setCc(e.target.value)}
									placeholder="Separate with commas"
								/>
							</div>
						</div>
					</div>
				)}

				{showBcc && (
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider w-12 shrink-0">
								BCC
							</label>
							<div className="flex-1">
								<Input
									type="text"
									size="sm"
									value={bcc}
									onChange={(e) => setBcc(e.target.value)}
									placeholder="Separate with commas"
								/>
							</div>
						</div>
					</div>
				)}

				{/* Editor & Actions */}
				<div className="w-full relative">
					<RichTextEditor
						value={body}
						onChange={setBody}
						leftFooterActions={
							<div className="relative flex items-center" ref={popoverRef}>
								<Tooltip content="Toggle CC/BCC" side="top" asChild>
									<Button
										type="button"
										variant={showCc || showBcc || showCcBccPopover ? "secondary" : "ghost"}
										shape="square"
										size="sm"
										onClick={() => setShowCcBccPopover(!showCcBccPopover)}
										aria-label="Toggle CC/BCC"
										icon={
											<div className="relative">
												<EnvelopeSimpleIcon size={18} weight={showCc || showBcc ? "fill" : "regular"} />
												<PlusIcon size={10} weight="bold" className="absolute -bottom-1 -right-1 bg-white rounded-full text-slate-700" />
											</div>
										}
									/>
								</Tooltip>
								{showCcBccPopover && (
									<div className="absolute bottom-full left-0 mb-2 z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 flex flex-col gap-1 w-32 animate-in fade-in zoom-in-95 duration-100">
										<Button
											type="button"
											variant={showCc ? "secondary" : "ghost"}
											size="sm"
											className="w-full justify-start text-xs"
											onClick={() => {
												setShowCc(!showCc);
												setShowCcBccPopover(false);
											}}
										>
											{showCc ? "Remove Cc" : "Add Cc"}
										</Button>
										<Button
											type="button"
											variant={showBcc ? "secondary" : "ghost"}
											size="sm"
											className="w-full justify-start text-xs"
											onClick={() => {
												setShowBcc(!showBcc);
												setShowCcBccPopover(false);
											}}
										>
											{showBcc ? "Remove Bcc" : "Add Bcc"}
										</Button>
									</div>
								)}
							</div>
						}
						footerActions={
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									loading={isSavingDraft}
									disabled={isSending}
									icon={<FloppyDiskIcon size={14} />}
									onClick={handleSaveDraft}
									aria-label="Save Draft"
								/>
								<Button
									type="submit"
									variant="primary"
									size="sm"
									loading={isSending}
									disabled={isSavingDraft || isSending}
									icon={<PaperPlaneTiltIcon size={14} />}
								>
									{isSending ? "Sending..." : "Send"}
								</Button>
							</div>
						}
					/>
				</div>
			</form>
		</div>
	);
}
