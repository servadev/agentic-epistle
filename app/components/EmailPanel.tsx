// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { useKumoToastManager } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Folders } from "shared/folders";
import { formatMessageGroupDate } from "shared/dates";
import EmailPanelDialogs from "~/components/email-panel/EmailPanelDialogs";
import EmailPanelHeader from "~/components/email-panel/EmailPanelHeader";
import EmailPanelToolbar from "~/components/email-panel/EmailPanelToolbar";
import ThreadMessage from "~/components/email-panel/ThreadMessage";
import SuggestedEventThreadItem from "~/components/email-panel/SuggestedEventThreadItem";
import TagModal from "~/components/TagModal";
import { splitEmailList, toEmailListValue } from "~/lib/utils";
import api from "~/services/api";
import { useDeleteEmail, useEmail, useMoveEmail, useReplyToEmail, useSendEmail, useThreadReplies, useUpdateEmail } from "~/queries/emails";
import { useFolders } from "~/queries/folders";
import { useMailbox } from "~/queries/mailboxes";
import { useContacts } from "~/queries/contacts";
import { useUIStore } from "~/hooks/useUIStore";
import type { Email, Folder, Mailbox } from "~/types";

function EmailPanelSkeleton() {
	return (
		<div className="animate-pulse p-5 space-y-4">
			<div className="h-5 w-2/3 rounded bg-kumo-fill" />
			<div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-kumo-fill" /><div className="space-y-2 flex-1"><div className="h-3 w-40 rounded bg-kumo-fill" /><div className="h-2.5 w-24 rounded bg-kumo-fill" /></div></div>
			<div className="space-y-2 pt-4"><div className="h-2.5 w-full rounded bg-kumo-fill" /><div className="h-2.5 w-5/6 rounded bg-kumo-fill" /><div className="h-2.5 w-4/6 rounded bg-kumo-fill" /><div className="h-2.5 w-3/4 rounded bg-kumo-fill" /></div>
		</div>
	);
}

export default function EmailPanel({ emailId }: { emailId: string }) {
	const { mailboxId, folder } = useParams<{ mailboxId: string; folder: string }>();
	const { data: email } = useEmail(mailboxId, emailId) as { data?: Email };
	const { data: threadRepliesRaw } = useThreadReplies(mailboxId, email?.thread_id) as {
		data?: Email[];
	};
	const updateEmail = useUpdateEmail();
	const deleteEmailMut = useDeleteEmail();
	const moveEmailMut = useMoveEmail();
	const sendEmailMut = useSendEmail();
	const replyMut = useReplyToEmail();
	const { data: folders = [] } = useFolders(mailboxId) as { data?: Folder[] };
	const { data: currentMailbox } = useMailbox(mailboxId) as {
		data?: Mailbox;
	};
	const { closePanel, startCompose } = useUIStore();
	const toastManager = useKumoToastManager();
	const [isSending, setIsSending] = useState(false);
	const [sourceViewEmail, setSourceViewEmail] = useState<Email | null>(null);
	const [previewImage, setPreviewImage] = useState<{ url: string; filename: string } | null>(null);

	// Modals state
	const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
	const [isTagModalOpen, setIsTagModalOpen] = useState(false);

	const { data: contactsData } = useContacts(mailboxId);
	const contacts = contactsData?.contacts || [];
	const senderMatch = email?.sender.match(/<([^>]+)>/);
	const rawSenderEmail = senderMatch ? senderMatch[1] : email?.sender;
	const senderContact = contacts.find(c => c.email.toLowerCase() === rawSenderEmail?.toLowerCase());
	const avatarUrl = senderContact?.avatar_url;

	const isDraftFolder = folder === Folders.DRAFT;

	const threadReplies = useMemo(() => {
		if (!threadRepliesRaw || !email) return [];
		return threadRepliesRaw.filter((e) => e.id !== email.id);
	}, [threadRepliesRaw, email]);

	const allMessages = useMemo(() => {
		if (!email) return [];
		return [email, ...threadReplies].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	}, [email, threadReplies]);

	const groupedMessages = useMemo(() => {
		const groups: { header: string; messages: Email[] }[] = [];
		let currentHeader = "";

		allMessages.forEach((msg) => {
			const header = formatMessageGroupDate(msg.date);
			if (header !== currentHeader) {
				groups.push({ header, messages: [msg] });
				currentHeader = header;
			} else {
				groups[groups.length - 1].messages.push(msg);
			}
		});
		return groups;
	}, [allMessages]);

	// Reset collapsed state when the selected email changes
	const currentEmailId = email?.id;

	const toggleExpand = (msgId: string) => {};

	const draftMessageIds = useMemo(() => {
		const ids = new Set<string>();
		for (const msg of allMessages) { if (msg.folder_id === Folders.DRAFT) ids.add(msg.id); else if (isDraftFolder && msg.id === emailId) ids.add(msg.id); }
		return ids;
	}, [allMessages, isDraftFolder, emailId]);

	// Find the ID to query for thread-level suggested events.
	// This should be the last received message in the thread, as that's what triggers the agent.
	const threadSuggestedEventsEmailId = useMemo(() => {
		if (allMessages.length === 0) return email?.id;
		
		const ce = currentMailbox?.email;
		if (!ce) return email?.id;

		const received = allMessages.filter(
			(m) =>
				m.folder_id === Folders.INBOX ||
				(m.recipient.toLowerCase().includes(ce.toLowerCase()) &&
					m.folder_id !== Folders.DRAFT &&
					m.folder_id !== Folders.SENT),
		);
		return received.length > 0 ? received[received.length - 1].id : email?.id;
	}, [allMessages, email?.id, currentMailbox?.email]);

	const lastReceivedMessage = useMemo(() => {
		const ce = currentMailbox?.email;
		const received = allMessages.filter((msg) => !draftMessageIds.has(msg.id) && msg.sender !== ce);
		if (received.length > 0) return received[0];
		const nonDrafts = allMessages.filter((msg) => !draftMessageIds.has(msg.id));
		return nonDrafts.length > 0 ? nonDrafts[0] : email;
	}, [allMessages, draftMessageIds, currentMailbox?.email, email]);

	const moveToFolders = useMemo(() => { const cur = folder || email?.folder_id; return folders.filter((f) => f.id !== cur); }, [folders, folder, email?.folder_id]);

	if (!email) return <EmailPanelSkeleton />;

	const toggleStar = () => { if (mailboxId) updateEmail.mutate({ mailboxId, id: email.id, data: { starred: !email.starred } }); };
	const handleMove = (folderId: string) => { if (mailboxId) { moveEmailMut.mutate({ mailboxId, id: email.id, folderId }); closePanel(); } };
	const handleDelete = () => {
		setIsDeleteConfirmOpen(true);
	};

	const executeDelete = () => {
		if (mailboxId && email) {
			if (folder === Folders.TRASH || isDraftFolder) {
				deleteEmailMut.mutate({ mailboxId, id: email.id });
			} else {
				moveEmailMut.mutate({ mailboxId, id: email.id, folderId: Folders.TRASH });
			}
			closePanel();
		}
		setIsDeleteConfirmOpen(false);
	};

	const handleEditDraft = (draftMsg?: Email) => {
		const target = draftMsg || email;
		if (target.in_reply_to) { startCompose({ mode: "reply", originalEmail: allMessages.find((msg) => msg.id === target.in_reply_to), draftEmail: target }); }
		else { startCompose({ mode: "new", originalEmail: undefined, draftEmail: target }); }
	};

	const handleDeleteDraft = async (draftMsg?: Email) => {
		const target = draftMsg || email;
		if (!mailboxId) return;
		if (!window.confirm("Discard this draft?")) return;
		deleteEmailMut.mutate({ mailboxId, id: target.id });
		toastManager.add({ title: "Draft discarded" });
		if (target.id === emailId) closePanel();
	};

	const handleSendDraft = async (draftMsg?: Email) => {
		let target = draftMsg || email;
		if (!mailboxId || !currentMailbox) return;
		setIsSending(true);
		try {
			if (!target.recipient || !target.subject) { try { const fresh = await api.getEmail(mailboxId, target.id) as Email; if (fresh) target = fresh; } catch {} }
			if (!target.recipient) { toastManager.add({ title: "Cannot send: no recipient set on this draft.", variant: "error" }); return; }
			const toRecipients = splitEmailList(target.recipient);
			if (toRecipients.length === 0) { toastManager.add({ title: "Cannot send: no valid recipient set on this draft.", variant: "error" }); return; }
			const fromName = currentMailbox.settings?.fromName || currentMailbox.name;
			const from = fromName && fromName !== currentMailbox.email ? { email: currentMailbox.email, name: fromName } : currentMailbox.email;
			const originalEmail = target.in_reply_to ? allMessages.find((msg) => msg.id === target.in_reply_to) : undefined;
			const emailData = {
				to: toEmailListValue(toRecipients),
				cc: toEmailListValue(splitEmailList(target.cc)),
				bcc: toEmailListValue(splitEmailList(target.bcc)),
				from,
				subject: target.subject || "(no subject)",
				html: target.body || "",
				text: target.body ? target.body.replace(/<[^>]*>/g, "").trim() : "",
			};
			if (originalEmail) await replyMut.mutateAsync({ mailboxId, emailId: originalEmail.id, email: emailData }); else await sendEmailMut.mutateAsync({ mailboxId, email: emailData });
			await deleteEmailMut.mutateAsync({ mailboxId, id: target.id });
			toastManager.add({ title: "Email sent!" });
			if (isDraftFolder) closePanel();
		} catch (err) {
			const message = (err instanceof Error ? err.message : null) || "Failed to send email.";
			toastManager.add({ title: message, variant: "error" });
		} finally { setIsSending(false); }
	};

	const hasThread = allMessages.length > 1;

	return (
		<div className="flex flex-col h-full">
			<EmailPanelHeader
				email={email}
				avatarUrl={avatarUrl || undefined}
				contactName={senderContact?.name || undefined}
				onClose={closePanel}
				toolbar={
					<EmailPanelToolbar
						email={email}
						mailboxId={mailboxId}
						isDraftFolder={isDraftFolder}
						isSending={isSending}
						moveToFolders={moveToFolders}
						onBack={closePanel}
						onSendDraft={() => handleSendDraft()}
						onEditDraft={() => handleEditDraft()}
						onReply={() =>
							startCompose({ mode: "reply", originalEmail: lastReceivedMessage })
						}
						onReplyAll={() =>
							startCompose({
								mode: "reply-all",
								originalEmail: lastReceivedMessage,
							})
						}
						onForward={() => startCompose({ mode: "forward", originalEmail: email })}
						onToggleStar={toggleStar}
						onToggleRead={() => {
							if (mailboxId) {
								updateEmail.mutate({
									mailboxId,
									id: email.id,
									data: { read: !email.read },
								});
							}
						}}
						onMove={handleMove}
						onTag={() => setIsTagModalOpen(true)}
						onViewSource={() => setSourceViewEmail(email)}
						onDelete={handleDelete}
					/>
				}
			/>

			<div className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8 bg-slate-50/50">
				{groupedMessages.map((group) => (
					<div key={group.header} className="mb-6">
						<div className="flex justify-center mb-6">
							<span className="bg-slate-200/60 text-slate-500 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
								{group.header}
							</span>
						</div>
						{group.messages.map((msg, idx) => {
							const isDraft = draftMessageIds.has(msg.id);
							return (
								<ThreadMessage
									key={msg.id}
									email={msg}
									mailboxId={mailboxId}
									mailboxEmail={currentMailbox?.email}
									isLast={idx === group.messages.length - 1 && group.header === groupedMessages[groupedMessages.length - 1].header}
									isDraft={isDraft}
									isSending={isDraft ? isSending : false}
									isExpanded={true}
									onToggleExpand={() => toggleExpand(msg.id)}
									onSendDraft={isDraft ? () => handleSendDraft(msg) : undefined}
									onEditDraft={isDraft ? () => handleEditDraft(msg) : undefined}
									onDeleteDraft={isDraft ? () => handleDeleteDraft(msg) : undefined}
									onViewSource={() => setSourceViewEmail(msg)}
									onPreviewImage={(url, filename) =>
										setPreviewImage({ url, filename })
									}
								/>
							);
						})}
					</div>
				))}
				{threadSuggestedEventsEmailId && (
					<SuggestedEventThreadItem
						mailboxId={mailboxId}
						queryEmailId={threadSuggestedEventsEmailId}
					/>
				)}
			</div>

			<EmailPanelDialogs
				sourceViewEmail={sourceViewEmail}
				previewImage={previewImage}
				onCloseSource={() => setSourceViewEmail(null)}
				onClosePreview={() => setPreviewImage(null)}
				isDeleteConfirmOpen={isDeleteConfirmOpen}
				onCloseDeleteConfirm={() => setIsDeleteConfirmOpen(false)}
				onConfirmDelete={executeDelete}
				isDeleting={deleteEmailMut.isPending || moveEmailMut.isPending}
				isTrashFolder={folder === Folders.TRASH}
			/>

			{mailboxId && (
				<TagModal
					email={email}
					mailboxId={mailboxId}
					isOpen={isTagModalOpen}
					onClose={() => setIsTagModalOpen(false)}
				/>
			)}
		</div>
	);
}

