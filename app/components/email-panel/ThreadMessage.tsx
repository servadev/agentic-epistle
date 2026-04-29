// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Button } from "@cloudflare/kumo";
import {
	PaperPlaneTiltIcon,
	PencilSimpleIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import EmailAttachmentList from "~/components/EmailAttachmentList";
import EmailIframe from "~/components/EmailIframe";
import {
	formatShortDate,
	rewriteInlineImages,
} from "~/lib/utils";
import type { Email } from "~/types";

interface ThreadMessageProps {
	email: Email;
	mailboxId?: string;
	mailboxEmail?: string;
	isLast: boolean;
	isDraft?: boolean;
	isSending?: boolean;
	isExpanded: boolean;
	onToggleExpand: () => void;
	onSendDraft?: () => void;
	onEditDraft?: () => void;
	onDeleteDraft?: () => void;
	onViewSource?: () => void;
	onPreviewImage?: (url: string, filename: string) => void;
}

export default function ThreadMessage({
	email,
	mailboxId,
	mailboxEmail,
	isLast,
	isDraft,
	isSending,
	isExpanded,
	onToggleExpand,
	onSendDraft,
	onEditDraft,
	onDeleteDraft,
	onViewSource,
	onPreviewImage,
}: ThreadMessageProps) {
	const isSelf = email.sender === mailboxEmail;
	
	// Chat bubble styling
	const bubbleAlignment = isSelf ? "justify-end" : "justify-start";
	const bubbleBg = isDraft ? "bg-amber-50 border-amber-200" : isSelf ? "bg-indigo-50 border-indigo-100" : "bg-white border-slate-200";
	const bubbleRadius = isSelf ? "rounded-2xl rounded-tr-sm" : "rounded-2xl rounded-tl-sm";

	return (
		<div className={`flex w-full ${bubbleAlignment} mb-4 group/thread-msg`}>
			<div className={`max-w-[90%] md:max-w-[85%] flex flex-col`}>
				<div className={`relative px-4 py-3 md:px-5 md:py-4 border shadow-sm ${bubbleBg} ${bubbleRadius}`}>
					<div className="-mx-2 -mt-2">
						<EmailIframe
							body={rewriteInlineImages(
								email.body || "",
								mailboxId || "",
								email.id,
								email.attachments,
							)}
							autoSize
							transparentBg={true}
						/>
					</div>

					{isDraft && (onSendDraft || onEditDraft || onDeleteDraft) && (
						<div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-amber-200/50">
							{onSendDraft && (
								<Button
									variant="primary"
									size="sm"
									icon={<PaperPlaneTiltIcon size={14} />}
									onClick={onSendDraft}
									loading={isSending}
									disabled={isSending}
								>
									{isSending ? "Sending..." : "Send"}
								</Button>
							)}
							{onEditDraft && (
								<Button
									variant="secondary"
									size="sm"
									icon={<PencilSimpleIcon size={14} />}
									onClick={onEditDraft}
									disabled={isSending}
								>
									Edit
								</Button>
							)}
							{onDeleteDraft && (
								<Button
									variant="ghost"
									size="sm"
									icon={<TrashIcon size={14} />}
									onClick={onDeleteDraft}
									disabled={isSending}
								>
									Discard
								</Button>
							)}
						</div>
					)}

					{email.attachments && email.attachments.length > 0 && (
						<div className="mt-3 pt-3 border-t border-slate-100">
							<EmailAttachmentList
								mailboxId={mailboxId}
								emailId={email.id}
								attachments={email.attachments}
								onPreviewImage={onPreviewImage}
							/>
						</div>
					)}
				</div>
				
				<div className={`flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 font-medium ${isSelf ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
					{formatShortDate(email.date)}
				</div>
			</div>
		</div>
	);
}
