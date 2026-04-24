import { useState } from "react";
import { useParams } from "react-router";
import { Button, Input, Tooltip, useKumoToastManager } from "@cloudflare/kumo";
import { useEvents, useCreateEvent, useDeleteEvent } from "~/queries/calendar";
import { CaretLeftIcon, CaretRightIcon, CalendarPlusIcon, XIcon, ClockIcon } from "@phosphor-icons/react";
import type { CalendarEvent } from "~/types";
import {
	startOfWeek,
	addDays,
	isSameDay,
	startOfDay,
	endOfDay,
	formatShortTime,
	formatMonthYear,
	formatDayName,
	formatDayNum,
	formatDateTime,
} from "shared/dates";

export default function CalendarRoute() {
	const { mailboxId } = useParams<{ mailboxId: string }>();
	const toastManager = useKumoToastManager();
	
	const [currentDate, setCurrentDate] = useState(new Date());
	const startDate = startOfWeek(currentDate); // Sunday
	
	// Query params for the week
	const weekStartStr = startOfDay(startDate).toISOString();
	const weekEndStr = endOfDay(addDays(startDate, 6)).toISOString();

	const { data: events = [], isLoading } = useEvents(mailboxId, { start: weekStartStr, end: weekEndStr });
	
	const [isNewEventOpen, setIsNewEventOpen] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

	const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
	const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
	const today = () => setCurrentDate(new Date());

	const createEventMutation = useCreateEvent();
	const deleteEventMutation = useDeleteEvent();

	const [newEvent, setNewEvent] = useState({ title: "", start_at: "", end_at: "", description: "" });

	const handleCreateEvent = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!mailboxId) return;
		
		if (!newEvent.title.trim()) { 
			toastManager.add({ title: 'Title is required', variant: 'error' }); 
			return; 
		}

		if (new Date(newEvent.start_at).getTime() >= new Date(newEvent.end_at).getTime()) { 
			toastManager.add({ title: 'Start time must be before end time', variant: 'error' }); 
			return; 
		}

		try {
			await createEventMutation.mutateAsync({
				mailboxId,
				event: {
					...newEvent,
					start_at: new Date(newEvent.start_at).toISOString(),
					end_at: new Date(newEvent.end_at).toISOString(),
				}
			});
			setIsNewEventOpen(false);
			setNewEvent({ title: "", start_at: "", end_at: "", description: "" });
			toastManager.add({ title: "Event created successfully!" });
		} catch (err) {
			const message = (err instanceof Error ? err.message : null) || "Failed to create event.";
			toastManager.add({ title: message, variant: "error" });
		}
	};

	const handleDeleteEvent = async (id: string) => {
		if (!mailboxId) return;
		try {
			await deleteEventMutation.mutateAsync({ mailboxId, id });
			setSelectedEvent(null);
			toastManager.add({ title: "Event deleted successfully!" });
		} catch (err) {
			const message = (err instanceof Error ? err.message : null) || "Failed to delete event.";
			toastManager.add({ title: message, variant: "error" });
		}
	};

	const hours = Array.from({ length: 24 }, (_, i) => i);
	const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

	return (
		<div className="flex h-full flex-col bg-kumo-base overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-kumo-line shrink-0">
				<div className="flex items-center gap-4">
					<h1 className="text-lg font-semibold text-kumo-default">Calendar</h1>
					<div className="flex items-center gap-1 bg-kumo-control rounded-md p-0.5">
						<Button variant="ghost" size="sm" onClick={prevWeek} icon={<CaretLeftIcon size={16} />} aria-label="Previous Week" />
						<Button variant="ghost" size="sm" onClick={today}>Today</Button>
						<Button variant="ghost" size="sm" onClick={nextWeek} icon={<CaretRightIcon size={16} />} aria-label="Next Week" />
					</div>
					<span className="text-sm font-medium text-kumo-strong">
						{formatMonthYear(startDate)}
					</span>
				</div>
				<Button variant="primary" icon={<CalendarPlusIcon size={16} />} onClick={() => setIsNewEventOpen(true)}>
					New event
				</Button>
			</div>

			{/* Main Grid */}
			<div className="flex flex-1 min-h-0">
				<div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
					{/* Days Header */}
					<div className="flex border-b border-kumo-line sticky top-0 bg-kumo-base z-10 shrink-0 ml-12">
						{days.map((day, i) => (
							<div key={i} className="flex-1 min-w-0 border-l border-kumo-line py-2 text-center">
								<div className="text-xs text-kumo-subtle uppercase tracking-wider">{formatDayName(day)}</div>
								<div className={`text-lg font-medium mt-0.5 ${isSameDay(day, new Date()) ? 'text-kumo-brand bg-kumo-brand/10 w-8 h-8 rounded-full flex items-center justify-center mx-auto' : 'text-kumo-default'}`}>
									{formatDayNum(day)}
								</div>
							</div>
						))}
					</div>

					{/* Time Grid */}
					<div className="flex flex-1 relative">
						{/* Time labels */}
						<div className="w-12 shrink-0 border-r border-kumo-line bg-kumo-base sticky left-0 z-10 flex flex-col">
							{hours.map(hour => (
								<div key={hour} className="h-16 border-b border-kumo-line flex items-start justify-center pt-1 text-xs text-kumo-subtle">
									{hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
								</div>
							))}
						</div>

						{/* Grid Cells & Events */}
						<div className="flex-1 flex relative">
							{days.map((day, dayIdx) => (
								<div key={dayIdx} className="flex-1 border-r border-kumo-line relative min-w-[100px]">
									{hours.map(hour => (
										<div key={hour} className="h-16 border-b border-kumo-line" />
									))}
									
									{/* Render Events for this day */}
									{events.filter((e: CalendarEvent) => isSameDay(new Date(e.start_at), day)).map((event: CalendarEvent) => {
										const start = new Date(event.start_at);
										const end = new Date(event.end_at);
										const top = start.getHours() * 64 + start.getMinutes() * (64 / 60);
										const height = ((end.getTime() - start.getTime()) / (1000 * 60)) * (64 / 60);
										
										return (
											<div 
												key={event.id}
												onClick={() => setSelectedEvent(event)}
												className="absolute left-1 right-1 rounded bg-kumo-brand/20 border border-kumo-brand/30 hover:bg-kumo-brand/30 p-1 overflow-hidden cursor-pointer transition-colors z-10"
												style={{ top: `${top}px`, height: `${Math.max(height, 24)}px` }}
											>
												<div className="text-xs font-semibold text-kumo-brand truncate leading-tight">{event.title}</div>
												{height > 40 && (
													<div className="text-[10px] text-kumo-brand/80 truncate">
														{formatShortTime(start)} - {formatShortTime(end)}
													</div>
												)}
											</div>
										);
									})}
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Side Panel for Event Details */}
				{selectedEvent && (
					<div className="w-80 border-l border-kumo-line bg-kumo-base shrink-0 flex flex-col animate-in slide-in-from-right-4">
						<div className="p-4 border-b border-kumo-line flex items-center justify-between">
							<h2 className="font-semibold text-kumo-default">Event Details</h2>
							<Button variant="ghost" size="sm" shape="square" icon={<XIcon />} onClick={() => setSelectedEvent(null)} aria-label="Close" />
						</div>
						<div className="p-4 space-y-4 flex-1 overflow-y-auto">
							<div>
								<h3 className="text-lg font-medium text-kumo-default">{selectedEvent.title}</h3>
								<div className="flex items-center gap-2 text-kumo-subtle mt-2 text-sm">
									<ClockIcon />
									<span>
										{formatDateTime(new Date(selectedEvent.start_at))} - {formatDateTime(new Date(selectedEvent.end_at))}
									</span>
								</div>
							</div>
							{selectedEvent.description && (
								<div className="pt-4 border-t border-kumo-line">
									<h4 className="text-xs font-medium text-kumo-strong uppercase mb-2">Description</h4>
									<p className="text-sm text-kumo-default whitespace-pre-wrap">{selectedEvent.description}</p>
								</div>
							)}
						</div>
						<div className="p-4 border-t border-kumo-line">
							<Button variant="destructive" className="w-full" onClick={() => handleDeleteEvent(selectedEvent.id)}>
								Delete Event
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* New Event Modal (Simple overlay) */}
			{isNewEventOpen && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
					<div className="bg-kumo-base rounded-lg shadow-lg w-full max-w-md overflow-hidden flex flex-col">
						<div className="p-4 border-b border-kumo-line flex items-center justify-between">
							<h2 className="font-semibold text-kumo-default">New Event</h2>
							<Button variant="ghost" size="sm" shape="square" icon={<XIcon />} onClick={() => setIsNewEventOpen(false)} aria-label="Close" />
						</div>
						<form onSubmit={handleCreateEvent} className="p-4 space-y-4">
							<Input 
								label="Title" 
								required 
								value={newEvent.title} 
								onChange={e => setNewEvent({...newEvent, title: e.target.value})} 
							/>
							<div className="grid grid-cols-2 gap-4">
								<Input 
									label="Start" 
									type="datetime-local" 
									required 
									value={newEvent.start_at} 
									onChange={e => setNewEvent({...newEvent, start_at: e.target.value})} 
								/>
								<Input 
									label="End" 
									type="datetime-local" 
									required 
									value={newEvent.end_at} 
									onChange={e => setNewEvent({...newEvent, end_at: e.target.value})} 
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-kumo-default mb-1">Description</label>
								<textarea 
									className="w-full rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm text-kumo-default focus:border-kumo-brand focus:outline-none focus:ring-1 focus:ring-kumo-brand resize-none"
									rows={3}
									value={newEvent.description}
									onChange={e => setNewEvent({...newEvent, description: e.target.value})}
								/>
							</div>
							<div className="pt-4 flex justify-end gap-2">
								<Button variant="secondary" onClick={() => setIsNewEventOpen(false)}>Cancel</Button>
								<Button variant="primary" type="submit" disabled={createEventMutation.isPending}>
									{createEventMutation.isPending ? "Saving..." : "Save"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
