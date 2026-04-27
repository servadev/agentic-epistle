import { useKumoToastManager } from "@cloudflare/kumo";
import { RobotIcon, CalendarPlusIcon, CheckIcon, XIcon } from "@phosphor-icons/react";
import { useSuggestedEvents, useCreateEvent, useDeleteEvent } from "~/queries/calendar";

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
	const createEvent = useCreateEvent();
	const deleteEvent = useDeleteEvent();

	if (!suggestedEvents || suggestedEvents.length === 0) {
		return null;
	}

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
					{suggestedEvents.map((event) => {
						const startDate = new Date(event.start_at);
						const month = startDate.toLocaleString('default', { month: 'short' });
						const day = startDate.getDate();
						
						const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
						const endTime = new Date(event.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

						return (
							<div key={event.id} className="bg-white border border-[#314158]/20 rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 w-full max-w-2xl">
								<div className="flex items-center gap-4 min-w-0">
									{/* Calendar Date Icon */}
									<div className="flex flex-col items-center justify-center bg-[#314158] text-white rounded-lg w-12 h-12 overflow-hidden shrink-0 shadow-sm">
										<div className="text-[10px] uppercase font-bold bg-[#1e293b] w-full text-center py-0.5 tracking-wider">{month}</div>
										<div className="text-lg font-bold leading-none py-1">{day}</div>
									</div>
									
									{/* Event Info */}
									<div className="min-w-0 flex-1">
										<div className="text-xs font-medium text-[#314158] flex items-center gap-2">
											<CalendarPlusIcon size={14} className="inline" />
											Add this meeting to your calendar?
											<button className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors ml-1">Edit</button>
										</div>
										<div className="font-bold text-sm text-slate-900 truncate mt-0.5">
											{event.title}
										</div>
										<div className="text-xs text-slate-500 mt-0.5">
											{startTime} - {endTime}
										</div>
									</div>
								</div>

								{/* Actions */}
								<div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
									<button 
										className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
										onClick={() => handleDismissEvent(event.id)}
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
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
