import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button, Input, useKumoToastManager } from "@cloudflare/kumo";
import { RobotIcon, CalendarPlusIcon, CheckIcon, XIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { useSuggestedEvents, useUpdateEvent, useDeleteEvent } from "~/queries/calendar";
import { ContactSelector } from "~/components/ContactSelector";
import type { CalendarEvent } from "~/types";

const CATEGORIES = [
  { id: "Meeting", label: "Meeting" },
  { id: "Call", label: "Call" },
  { id: "Appointment", label: "Appointment" },
  { id: "Deadline", label: "Deadline" },
  { id: "Reminder", label: "Reminder" },
  { id: "Travel", label: "Travel" },
  { id: "Social", label: "Social" },
];

interface SuggestedEventThreadItemProps {
	mailboxId?: string;
	queryEmailId: string;
}

export default function SuggestedEventThreadItem({
	mailboxId,
	queryEmailId,
}: SuggestedEventThreadItemProps) {
	const toastManager = useKumoToastManager();
	const { data: suggestedEvents } = useSuggestedEvents(mailboxId, queryEmailId);
	const updateEvent = useUpdateEvent();
	const deleteEvent = useDeleteEvent();

	const [confirmedEvents, setConfirmedEvents] = useState<Record<string, any>>({});
	const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
	const [isEditEventOpen, setIsEditEventOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const displayEvents = suggestedEvents || [];

	if (displayEvents.length === 0) {
		return null;
	}

	const handleAddEvent = (event: any) => {
		if (!mailboxId) return;

		setConfirmedEvents(prev => ({ ...prev, [event.id]: event }));

		updateEvent.mutate(
			{
				mailboxId,
				id: event.id,
				event: { source: `confirmed_suggested:${queryEmailId}` },
			},
			{
				onSuccess: () => {
					toastManager.add({ title: "Event added to calendar" });
				},
				onError: () => {
					setConfirmedEvents(prev => {
						const next = { ...prev };
						delete next[event.id];
						return next;
					});
					toastManager.add({ title: "Failed to add event", variant: "error" });
				},
			}
		);
	};

	const handleDismissEvent = (eventId: string, isConfirmed: boolean) => {
		if (!mailboxId) return;
		deleteEvent.mutate({ mailboxId, id: eventId }, {
			onSuccess: () => {
				toastManager.add({ title: isConfirmed ? "Event removed from calendar" : "Suggestion dismissed" });
			},
		});
	};

	const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!mailboxId || !editEvent) return;

		if (!editEvent.title.trim()) {
			toastManager.add({ title: "Title is required", variant: "error" });
			return;
		}

		if (new Date(editEvent.start_at).getTime() >= new Date(editEvent.end_at).getTime()) {
			toastManager.add({ title: "Start time must be before end time", variant: "error" });
			return;
		}

		try {
			await updateEvent.mutateAsync({
				mailboxId,
				id: editEvent.id,
				event: {
					title: editEvent.title,
					start_at: new Date(editEvent.start_at).toISOString(),
					end_at: new Date(editEvent.end_at).toISOString(),
					description: editEvent.description,
					category: editEvent.category,
					contacts: editEvent.contacts,
				},
			});
			setIsEditEventOpen(false);
			toastManager.add({ title: "Suggestion updated successfully!" });
		} catch (err) {
			const message = (err instanceof Error ? err.message : null) || "Failed to update suggestion.";
			toastManager.add({ title: message, variant: "error" });
		}
	};

	return (
		<div className="group/thread-msg border-t border-slate-200 bg-slate-50/50">
			<div className="px-4 py-4 md:px-6">
				<div className="flex items-center gap-3 mb-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 shadow-sm">
						<RobotIcon size={20} weight="duotone" />
					</div>
					<div>
						<div className="text-sm font-medium text-slate-900">
							AI Agent Suggestion
						</div>
						<div className="text-xs text-slate-500">
							Based on this thread
						</div>
					</div>
				</div>

				<div className="md:ml-[48px] flex flex-col gap-3">
					{displayEvents.map((event) => {
						const isConfirmed = !!confirmedEvents[event.id] || event.source?.startsWith('confirmed_suggested:');
						const startDate = new Date(event.start_at);
						const month = startDate.toLocaleString('default', { month: 'short' });
						const day = startDate.getDate();
						
						const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
						const endTime = new Date(event.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

						return (
							<div key={event.id} className={`relative border ${isConfirmed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-[#314158]/20'} rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 w-full max-w-2xl transition-colors`}>
								{isConfirmed && (
									<button
										onClick={() => handleDismissEvent(event.id, isConfirmed)}
										className="absolute top-2 right-2 p-1 text-emerald-600/50 hover:text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors"
										aria-label="Remove from calendar"
										title="Remove from calendar"
									>
										<XIcon size={14} weight="bold" />
									</button>
								)}
								<div className={`flex items-center gap-4 min-w-0 transition-opacity ${isConfirmed ? 'opacity-80' : 'opacity-100'}`}>
									{/* Calendar Date Icon */}
									<div className={`flex flex-col items-center justify-center ${isConfirmed ? 'bg-emerald-600' : 'bg-[#314158]'} text-white rounded-lg w-12 h-12 overflow-hidden shrink-0 shadow-sm transition-colors`}>
										<div className={`text-[10px] uppercase font-bold ${isConfirmed ? 'bg-emerald-700' : 'bg-[#1e293b]'} w-full text-center py-0.5 tracking-wider transition-colors`}>{month}</div>
										<div className="text-lg font-bold leading-none py-1">{day}</div>
									</div>
									
									{/* Event Info */}
									<div className="min-w-0 flex-1">
										{isConfirmed ? (
											<div className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
												<CheckCircleIcon size={16} weight="fill" />
												Event added to calendar
											</div>
										) : (
											<div className="text-xs font-medium text-[#314158] flex items-center gap-2">
												<CalendarPlusIcon size={14} className="inline" />
												Add this meeting to your calendar?
												<button 
													className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors ml-1"
													onClick={() => {
														setEditEvent({
															...event,
															contacts: event.contacts || [],
														});
														setIsEditEventOpen(true);
													}}
												>Edit</button>
											</div>
										)}
										<div className={`font-bold text-sm truncate mt-0.5 ${isConfirmed ? 'text-emerald-950' : 'text-slate-900'}`}>
											{event.title}
										</div>
										<div className={`text-xs mt-0.5 ${isConfirmed ? 'text-emerald-700/80' : 'text-slate-500'}`}>
											{startTime} - {endTime}
										</div>
									</div>
								</div>

								{/* Actions */}
								{!isConfirmed && (
									<div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
										<button 
											className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
											onClick={() => handleDismissEvent(event.id, false)}
											aria-label="Reject"
										>
											<XIcon size={16} weight="bold" />
										</button>
										<button 
											className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#314158] text-white hover:bg-[#1e293b] transition-colors shadow-sm"
											onClick={() => handleAddEvent(event)}
											aria-label="Accept"
										>
											<CheckIcon size={16} weight="bold" />
										</button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{mounted && isEditEventOpen && createPortal(
				<div
					className="fixed inset-0 z-[100] flex items-center justify-center p-4"
					aria-labelledby="modal-title"
					role="dialog"
					aria-modal="true"
				>
					<div
						className="absolute inset-0 bg-black/30 transition-opacity"
						onClick={() => setIsEditEventOpen(false)}
					/>
					<div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
						<div className="p-4 border-b border-kumo-line flex items-center justify-between">
							<h2 className="font-semibold text-kumo-default">
								Edit Suggestion
							</h2>
							<Button
								variant="ghost"
								size="sm"
								shape="square"
								icon={<XIcon />}
								onClick={() => setIsEditEventOpen(false)}
								aria-label="Close"
							/>
						</div>
						{editEvent && (
							<form
								onSubmit={handleUpdateEvent}
								className="p-4 space-y-4"
							>
								<Input
									label="Title"
									required
									value={editEvent.title}
									onChange={(e) =>
										setEditEvent({
											...editEvent,
											title: e.target.value,
										})
									}
								/>
								<div className="flex flex-col sm:flex-row gap-4">
									<div className="flex-1 min-w-0">
										<Input
											label="Start"
											type="datetime-local"
											required
											value={
												editEvent.start_at
													? new Date(editEvent.start_at)
															.toISOString()
															.slice(0, 16)
													: ""
											}
											onChange={(e) =>
												setEditEvent({
													...editEvent,
													start_at: e.target.value,
												})
											}
										/>
									</div>
									<div className="flex-1 min-w-0">
										<Input
											label="End"
											type="datetime-local"
											required
											value={
												editEvent.end_at
													? new Date(editEvent.end_at)
															.toISOString()
															.slice(0, 16)
													: ""
											}
											onChange={(e) =>
												setEditEvent({
													...editEvent,
													end_at: e.target.value,
												})
											}
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-kumo-default mb-1">
										Category
									</label>
									<select
										className="w-full rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm text-kumo-default focus:border-kumo-brand focus:outline-none focus:ring-1 focus:ring-kumo-brand"
										value={editEvent.category || "Meeting"}
										onChange={(e) =>
											setEditEvent({
												...editEvent,
												category: e.target.value,
											})
										}
									>
										{CATEGORIES.map((c) => (
											<option key={c.id} value={c.id}>
												{c.label}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-kumo-default mb-1">
										Description
									</label>
									<textarea
										className="w-full rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm text-kumo-default focus:border-kumo-brand focus:outline-none focus:ring-1 focus:ring-kumo-brand resize-none"
										rows={3}
										value={editEvent.description || ""}
										onChange={(e) =>
											setEditEvent({
												...editEvent,
												description: e.target.value,
											})
										}
									/>
								</div>
								<ContactSelector
									mailboxId={mailboxId}
									selectedContacts={editEvent.contacts || []}
									onChange={(contacts) =>
										setEditEvent({ ...editEvent, contacts })
									}
								/>
								<div className="pt-4 flex justify-end gap-2">
									<Button
										type="button"
										variant="secondary"
										onClick={() => setIsEditEventOpen(false)}
									>
										Cancel
									</Button>
									<Button
										variant="primary"
										type="submit"
										disabled={updateEvent.isPending}
									>
										{updateEvent.isPending
											? "Saving..."
											: "Save Changes"}
									</Button>
								</div>
							</form>
						)}
					</div>
				</div>,
				document.body
			)}
		</div>
	);
}
