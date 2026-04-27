// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import EmailAttachmentList from "~/components/EmailAttachmentList";
import EmailIframe from "~/components/EmailIframe";
import { Folders } from "shared/folders";
import {
	formatDetailDate, rewriteInlineImages } from "~/lib/utils";
import { useContacts } from "~/queries/contacts";
import type { Email } from "~/types";
import { useSuggestedEvents, useCreateEvent, useDeleteEvent } from "~/queries/calendar";
import { CalendarPlus, CalendarX, TrashIcon } from "@phosphor-icons/react";
import { Button, useKumoToastManager } from "@cloudflare/kumo";

interface SingleMessageViewProps {
	email: Email;
	mailboxId?: string;
	onPreviewImage: (url: string, filename: string) => void;
}

export default function SingleMessageView({
	email,
	mailboxId,
	onPreviewImage,
}: SingleMessageViewProps) {
	const toastManager = useKumoToastManager();
	const queryEmailId = email.folder_id === Folders.DRAFT && email.in_reply_to ? email.in_reply_to : email.id;
	const { data: suggestedEvents } = useSuggestedEvents(mailboxId, queryEmailId);
	const createEvent = useCreateEvent();
	const deleteEvent = useDeleteEvent();

	const { data: contactsData } = useContacts(mailboxId);
	const contacts = contactsData?.contacts || [];
	const senderMatch = email.sender.match(/<([^>]+)>/);
	const rawSenderEmail = senderMatch ? senderMatch[1] : email.sender;
	const senderContact = contacts.find(c => c.email.toLowerCase() === rawSenderEmail.toLowerCase());
	const avatarUrl = senderContact?.avatar_url;

	const handleAddEvent = (event: any) => {
		if (!mailboxId) return;
		// Create the real event
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
					// source is omitted to be a normal event
				}
			},
			{
				onSuccess: () => {
					toastManager.add({ title: "Event added to calendar" });
					// Delete the suggested event
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

	return (
		<div className="flex flex-col h-full">
			<div className="px-4 py-4 border-b border-kumo-line md:px-6">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5 min-w-0">
						{avatarUrl ? (
							<img
								src={avatarUrl}
								alt=""
								className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg object-cover bg-kumo-fill shadow-sm"
							/>
						) : (
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-600 text-xs font-bold shadow-sm">
								{email.sender.charAt(0).toUpperCase()}
							</div>
						)}
						<div className="min-w-0">
							<div className="text-sm font-medium text-kumo-default truncate">
								{email.sender}
							</div>
							<div className="text-xs text-kumo-subtle">To: {email.recipient}</div>
						</div>
					</div>
					<span className="text-xs text-kumo-subtle shrink-0">
						{formatDetailDate(email.date)}
					</span>
				</div>
			</div>

			<div className="flex-1 min-h-0 flex flex-col">
				<div className="flex-1 overflow-auto">
					<EmailIframe
						body={rewriteInlineImages(
							email.body || "",
							mailboxId || "",
							email.id,
							email.attachments,
						)}
					/>
				</div>
				
				{suggestedEvents && suggestedEvents.length > 0 && (
					<div className="mt-4 flex flex-col gap-3">
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
			</div>

			<EmailAttachmentList
				mailboxId={mailboxId}
				emailId={email.id}
				attachments={email.attachments}
				onPreviewImage={onPreviewImage}
				className="px-4 py-3 border-t border-kumo-line shrink-0 md:px-6"
				showHeading
			/>
		</div>
	);
}
