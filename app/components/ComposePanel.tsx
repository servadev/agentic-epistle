// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Banner, Button, Input } from "@cloudflare/kumo";
import { FloppyDiskIcon, PaperPlaneTiltIcon, XIcon } from "@phosphor-icons/react";
import { useParams } from "react-router";
import { useComposeForm } from "~/hooks/useComposeForm";
import RichTextEditor from "./RichTextEditor";
import type { Email } from "~/types";

export default function ComposePanel({ defaultReplyEmail }: { defaultReplyEmail?: Email }) {
	const { mailboxId, folder } = useParams<{
		mailboxId: string;
		folder: string;
	}>();

	const {
		to,
		setTo,
		cc,
		setCc,
		bcc,
		setBcc,
		showCcBcc,
		setShowCcBcc,
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
	} = useComposeForm(mailboxId, folder, defaultReplyEmail);

	// Safe to use mailboxId directly as the From address for now
	const fromAddress = mailboxId || "";

	return (
		<div className="flex flex-col w-full bg-white px-4 py-3 md:px-6">
			<form
				onSubmit={(e) => handleSend(e, closePanel)}
				className="flex flex-col gap-3"
			>
				{error && <Banner variant="error" text={error} />}

				{/* Metadata fields (compact) */}
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider w-12 shrink-0">
							From
						</label>
						<div className="flex-1">
							<Input
								type="text"
								size="sm"
								value={fromAddress}
								disabled
								className="bg-slate-50 text-slate-500"
							/>
						</div>
					</div>

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
							{!showCcBcc && (
								<button
									type="button"
									onClick={() => setShowCcBcc(true)}
									className="shrink-0 text-[10px] text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider"
								>
									CC/BCC
								</button>
							)}
						</div>
					</div>

					{showCcBcc && (
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
					)}

					{showCcBcc && (
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
					)}

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

				{/* Editor & Actions */}
				<div className="w-full relative">
					<RichTextEditor
						value={body}
						onChange={setBody}
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
