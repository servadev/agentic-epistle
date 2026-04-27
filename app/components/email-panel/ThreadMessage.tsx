// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Badge, Button, Tooltip } from "@cloudflare/kumo";
import {
	CaretDownIcon,
	CaretUpIcon,
	CodeIcon,
	PaperPlaneTiltIcon,
	PencilSimpleIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import EmailAttachmentList from "~/components/EmailAttachmentList";
import EmailIframe from "~/components/EmailIframe";
import {
	formatDetailDate,
	formatShortDate,
	rewriteInlineImages,
	stripHtml,
} from "~/lib/utils";
import { useContacts } from "~/queries/contacts";
import { useSuggestedEvents, useCreateEvent, useDeleteEvent } from "~/queries/calendar";
import { useKumoToastManager } from "@cloudflare/kumo";
import type { Email } from "~/types";

interface ThreadMessageProps {
	email: Email;
	suggestedEventsEmailId?: string;
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

function Avatar({ isDraft, isSelf, sender, avatarUrl }: { isDraft?: boolean; isSelf: boolean; sender: string; avatarUrl?: string }) {
	if (avatarUrl) {
		return (
			<img src={avatarUrl} alt="" className="flex h-8 w-8 shrink-0 rounded-lg object-cover bg-slate-100 shadow-sm" />
		);
	}
	return (
		<div
			className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-sm ${
				isDraft
					? "bg-slate-100 text-slate-500"
					: isSelf
						? "bg-indigo-600 text-white"
						: "bg-slate-100 text-slate-900"
			}`}
		>
			{isDraft ? "D" : sender.charAt(0).toUpperCase()}
		</div>
	);
}

export default function ThreadMessage({
	email,
	suggestedEventsEmailId,
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
	const { data: contactsData } = useContacts(mailboxId);
	const contacts = contactsData?.contacts || [];
	
	const toastManager = useKumoToastManager();
	const queryEmailId = suggestedEventsEmailId || email.id;
	const { data: suggestedEvents } = useSuggestedEvents(mailboxId, queryEmailId);
	const createEvent = useCreateEvent();
	const deleteEvent = useDeleteEvent();

	const handleAddEvent = (event: any) => {
		if (!mailboxId) return;
		createEvent.mutate(
			{
				mailboxId,
				event: {
					title: event.title,
					start_at: event.start_at,
					end_at: event.end_at,
					description: event.description,
					location: event.location,
					all_day: event.all_day,
				}
			},
			{
				onSuccess: () => {
					toastManager.add({ title: "Event added to calendar" });
					deleteEvent.mutate({ mailboxId, id: event.id });
				},
				onError: () => {
					toastManager.add({ title: "Failed to add event", variant: "error" });
				},
			},
		);
	};

	const handleDismissEvent = (eventId: string) => {
		if (!mailboxId) return;
		deleteEvent.mutate({ mailboxId, id: eventId }, {
			onSuccess: () => {
				toastManager.add({ title: "Suggestion dismissed" });
			},
		});
	};

	const senderMatch = email.sender.match(/<([^>]+)>/);
	const rawSenderEmail = senderMatch ? senderMatch[1] : email.sender;
	const senderContact = contacts.find(c => c.email.toLowerCase() === rawSenderEmail.toLowerCase());
	const avatarUrl = senderContact?.avatar_url;

	const isSelf = email.sender === mailboxEmail;
	const containerClassName = `${!isLast ? "border-b border-slate-200" : ""} ${isDraft ? "border-l-2 border-l-amber-500 bg-amber-50/50" : ""}`;
	const senderLabel = isDraft ? "Draft reply" : isSelf ? "You" : email.sender;

	if (!isExpanded) {
		return (
			<div className={containerClassName}>
				<button
					type="button"
					onClick={onToggleExpand}
					className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg text-left"
				>
					<Avatar isDraft={isDraft} isSelf={isSelf} sender={email.sender} avatarUrl={avatarUrl || undefined} />
					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-slate-900 truncate">
								{senderLabel}
							</span>
							<span className="text-xs text-slate-500 shrink-0">
								{formatDetailDate(email.date)}
							</span>
						</div>
						<p className="text-xs text-slate-500 truncate">
							{stripHtml(email.body || "").slice(0, 80)}
						</p>
					</div>
					<CaretDownIcon size={14} className="text-slate-500 shrink-0" />
				</button>
			</div>
		);
	}

	return (
		<div className={`group/thread-msg ${containerClassName}`}>
			<div className="px-4 py-4 md:px-6">
				<div className="flex items-center justify-between gap-3 mb-3">
					<div className="flex items-center gap-2.5 min-w-0">
						<button
							type="button"
							onClick={onToggleExpand}
							className="shrink-0"
							aria-label="Collapse message"
						>
							<div className="cursor-pointer hover:ring-2 hover:ring-indigo-600/30 transition-shadow rounded-lg">
								<Avatar isDraft={isDraft} isSelf={isSelf} sender={email.sender} avatarUrl={avatarUrl || undefined} />
							</div>
						</button>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<span className="text-sm font-medium text-slate-900 truncate">
									{senderLabel}
								</span>
								{isDraft && <Badge variant="outline">Draft</Badge>}
							</div>
							<div className="text-xs text-slate-500">To: {email.recipient}</div>
						</div>
					</div>
					<div className="flex items-center gap-1 shrink-0">
						<span className="text-xs text-slate-500">
							{formatShortDate(email.date)}
						</span>
						{onViewSource && (
							<Tooltip content="View source" side="bottom" asChild>
								<Button
									variant="ghost"
									shape="square"
									size="sm"
									icon={<CodeIcon size={14} />}
									onClick={onViewSource}
									aria-label="View source"
									className="transition-opacity !h-6 !w-6"
								/>
							</Tooltip>
						)}
						<button
							type="button"
							onClick={onToggleExpand}
							className="ml-1"
							aria-label="Collapse message"
						>
							<CaretUpIcon
								size={14}
								className="text-slate-500 hover:text-slate-900 transition-colors"
							/>
						</button>
					</div>
				</div>

				<div className="md:ml-[42px]">
					<EmailIframe
						body={rewriteInlineImages(
							email.body || "",
							mailboxId || "",
							email.id,
							email.attachments,
						)}
						autoSize
					/>
				</div>

				{suggestedEvents && suggestedEvents.length > 0 && (
					<div className="mt-4 md:ml-[42px] flex flex-col gap-3">
						{suggestedEvents.map((event) => {
							const startDate = new Date(event.start_at);
							const month = startDate.toLocaleString('default', { month: 'short' });
							const day = startDate.getDate();
							
							const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
							const endTime = new Date(event.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

							return (
								<div key={event.id} className="bg-white dark:bg-slate-900 border border-teal-500/40 rounded-xl p-3 shadow-sm flex items-center justify-between gap-4 w-full md:w-max md:min-w-[480px]">
									<div className="flex items-center gap-4 min-w-0">
										{/* Calendar Date Icon */}
										<div className="flex flex-col items-center justify-center bg-teal-600 text-white rounded-lg w-12 h-12 overflow-hidden shrink-0 shadow-sm">
											<div className="text-[10px] uppercase font-bold bg-teal-700/80 w-full text-center py-0.5 tracking-wider">{month}</div>
											<div className="text-lg font-bold leading-none py-1">{day}</div>
										</div>
										
										{/* Event Info */}
										<div className="min-w-0 flex-1">
											<div className="text-xs font-medium text-teal-700 dark:text-teal-400 flex items-center gap-2">
												Add this meeting to your calendar?
												<button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold transition-colors">Edit</button>
											</div>
											<div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate mt-0.5">
												{event.title}
											</div>
											<div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
												{startTime}-{endTime}
											</div>
										</div>
									</div>

									{/* Actions */}
									<div className="flex items-center gap-2 shrink-0 pl-2">
										<Button 
											size="sm" 
											variant="outline" 
											className="h-8 px-4 text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg"
											onClick={() => handleDismissEvent(event.id)}
										>
											Reject
										</Button>
										<Button 
											size="sm" 
											className="h-8 px-4 text-xs font-medium bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg border-0 shadow-sm"
											onClick={() => handleAddEvent(event)}
										>
											Accept
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{isDraft && (onSendDraft || onEditDraft || onDeleteDraft) && (
					<div className="flex gap-2 mt-3 md:ml-[42px]">
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

				<EmailAttachmentList
					mailboxId={mailboxId}
					emailId={email.id}
					attachments={email.attachments}
					onPreviewImage={onPreviewImage}
					className="mt-3 md:ml-[42px]"
				/>
			</div>
		</div>
	);
}
