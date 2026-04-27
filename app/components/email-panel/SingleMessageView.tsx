// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import EmailAttachmentList from "~/components/EmailAttachmentList";
import EmailIframe from "~/components/EmailIframe";
import { formatDetailDate, rewriteInlineImages } from "~/lib/utils";
import { useContacts } from "~/queries/contacts";
import type { Email } from "~/types";
import { useSuggestedEvents, useCreateEvent, useDeleteEvent } from "~/queries/calendar";
import { CalendarPlus, CalendarX } from "@phosphor-icons/react";
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
	const { data: suggestedEvents } = useSuggestedEvents(mailboxId, email.id);
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
					<div className="px-4 py-3 bg-blue-50/50 border-t border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50 flex flex-col gap-3 shrink-0">
						<div className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
							<CalendarPlus className="h-4 w-4" />
							Suggested Meetings
						</div>
						{suggestedEvents.map((event) => (
							<div key={event.id} className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-md p-3 shadow-sm flex items-center justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
										{event.title}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
										{new Date(event.start_at).toLocaleString()} - {new Date(event.end_at).toLocaleTimeString()}
									</div>
								</div>
								<div className="flex items-center gap-2 shrink-0">
									<Button 
										size="sm" 
										variant="outline" 
										className="h-8 text-xs border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/30"
										onClick={() => handleDismissEvent(event.id)}
									>
										Dismiss
									</Button>
									<Button 
										size="sm" 
										className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
										onClick={() => handleAddEvent(event)}
									>
										Add to Calendar
									</Button>
								</div>
							</div>
						))}
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
