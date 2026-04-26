import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router";
import { Button, Input, useKumoToastManager } from "@cloudflare/kumo";
import { useEvents, useCreateEvent, useDeleteEvent, useUpdateEvent } from "~/queries/calendar";
import { useContacts } from "~/queries/contacts";
import { CaretLeftIcon, CaretRightIcon, CalendarPlusIcon, XIcon, ClockIcon, DotsThreeIcon, UserCircleIcon } from "@phosphor-icons/react";
import { ContactSelector } from "~/components/ContactSelector";
import type { CalendarEvent, Contact } from "~/types";
import {
	startOfWeek,
	addDays,
	addMonths,
	startOfMonth,
	endOfMonth,
	isSameDay,
	startOfDay,
	endOfDay,
	formatShortTime,
	formatMonthYear,
	formatDayName,
	formatDayNum,
	formatDateTime,
} from "shared/dates";

function EventMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	return (
		<div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
			<Button
				variant="ghost"
				shape="square"
				size="sm"
				icon={<DotsThreeIcon size={16} />}
				onClick={(e) => {
					e.stopPropagation();
					setOpen((o) => !o);
				}}
				aria-label="Event options"
			/>
			{open && (
				<div className="absolute top-full right-0 z-50 mt-1 w-32 rounded-lg border border-kumo-line bg-white shadow-lg py-1">
					<button
						type="button"
						className="w-full text-left px-3 py-1.5 text-sm text-slate-900 hover:bg-slate-50 transition-colors"
						onClick={(e) => {
							e.stopPropagation();
							setOpen(false);
							onEdit();
						}}
					>
						Edit
					</button>
					<button
						type="button"
						className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
						onClick={(e) => {
							e.stopPropagation();
							setOpen(false);
							onDelete();
						}}
					>
						Delete
					</button>
				</div>
			)}
		</div>
	);
}

export default function CalendarRoute() {
	const { mailboxId } = useParams<{ mailboxId: string }>();
	const toastManager = useKumoToastManager();
	
	const [currentDate, setCurrentDate] = useState(new Date());
	const [view, setView] = useState<'day' | 'week' | 'month'>('month');
	const startDate = startOfWeek(currentDate); // Sunday
	
	// Query params for the visible range
	let startStr = "";
	let endStr = "";
	
	if (view === 'day') {
		startStr = startOfDay(currentDate).toISOString();
		endStr = endOfDay(currentDate).toISOString();
	} else if (view === 'week') {
		startStr = startOfDay(startDate).toISOString();
		endStr = endOfDay(addDays(startDate, 6)).toISOString();
	} else {
		// month view - query the whole month plus padding weeks
		const monthStart = startOfMonth(currentDate);
		const monthEnd = endOfMonth(currentDate);
		startStr = startOfDay(startOfWeek(monthStart)).toISOString();
		endStr = endOfDay(addDays(startOfWeek(monthEnd), 6)).toISOString();
	}

	const { data: events = [] } = useEvents(mailboxId, { start: startStr, end: endStr });
	const { data: contactsData } = useContacts(mailboxId);
	const contactsMap = new Map<string, Contact>();
	if (contactsData?.contacts) {
		for (const c of contactsData.contacts) {
			contactsMap.set(c.id, c);
		}
	}
	
	const [isNewEventOpen, setIsNewEventOpen] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
	const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
	const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	const nextRange = () => {
		if (view === 'day') setCurrentDate(addDays(currentDate, 1));
		else if (view === 'week') setCurrentDate(addDays(currentDate, 7));
		else setCurrentDate(addMonths(currentDate, 1));
	};
	const prevRange = () => {
		if (view === 'day') setCurrentDate(addDays(currentDate, -1));
		else if (view === 'week') setCurrentDate(addDays(currentDate, -7));
		else setCurrentDate(addMonths(currentDate, -1));
	};
	const today = () => setCurrentDate(new Date());

	const createEventMutation = useCreateEvent();
	const deleteEventMutation = useDeleteEvent();
	const updateEventMutation = useUpdateEvent();

	const [newEvent, setNewEvent] = useState<{
		title: string;
		start_at: string;
		end_at: string;
		description: string;
		contacts: string[];
	}>({ title: "", start_at: "", end_at: "", description: "", contacts: [] });
	const [isEditEventOpen, setIsEditEventOpen] = useState(false);
	const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

	const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
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
			setNewEvent({ title: "", start_at: "", end_at: "", description: "", contacts: [] });
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
			if (selectedEvent?.id === id) setSelectedEvent(null);
			setEventToDelete(null);
			toastManager.add({ title: "Event deleted successfully!" });
		} catch (err) {
			const message = (err instanceof Error ? err.message : null) || "Failed to delete event.";
			toastManager.add({ title: message, variant: "error" });
		}
	};

	const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!mailboxId || !editEvent) return;

		if (!editEvent.title.trim()) {
			toastManager.add({ title: 'Title is required', variant: 'error' });
			return;
		}

		if (new Date(editEvent.start_at).getTime() >= new Date(editEvent.end_at).getTime()) {
			toastManager.add({ title: 'Start time must be before end time', variant: 'error' });
			return;
		}

		try {
			await updateEventMutation.mutateAsync({
				mailboxId,
				id: editEvent.id,
				event: {
					title: editEvent.title,
					start_at: new Date(editEvent.start_at).toISOString(),
					end_at: new Date(editEvent.end_at).toISOString(),
					description: editEvent.description,
					contacts: editEvent.contacts,
				}
			});
			setIsEditEventOpen(false);
			if (selectedEvent?.id === editEvent.id) {
				setSelectedEvent({ ...selectedEvent, ...editEvent });
			}
			toastManager.add({ title: "Event updated successfully!" });
		} catch (err) {
			const message = (err instanceof Error ? err.message : null) || "Failed to update event.";
			toastManager.add({ title: message, variant: "error" });
		}
	};

	const hours = Array.from({ length: 24 }, (_, i) => i);
	let days: Date[] = [];
	if (view === 'day') {
		days = [currentDate];
	} else if (view === 'week') {
		days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
	} else {
		const monthStart = startOfMonth(currentDate);
		const monthEnd = endOfMonth(currentDate);
		const calStart = startOfWeek(monthStart);
		const calEnd = addDays(startOfWeek(monthEnd), 6);
		let d = calStart;
		while (d <= calEnd) {
			days.push(d);
			d = addDays(d, 1);
		}
	}

	return (
		<>
			<div className="flex h-full overflow-hidden bg-kumo-base relative">
				{/* Column 2: Agenda List */}
				<div className="hidden lg:flex flex-col w-[350px] shrink-0 border-r border-kumo-line bg-white z-10">
				<div className="px-4 py-3.5 border-b border-kumo-line shrink-0 flex items-center justify-between">
					<h1 className="text-lg font-bold text-slate-900 tracking-tight">Agenda</h1>
				</div>
				<div className="flex-1 overflow-y-auto p-4 space-y-3">
					{events.length === 0 ? (
						<div className="text-sm text-kumo-subtle text-center py-4">No upcoming events</div>
					) : (
						events
							.slice()
							.sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
							.map((event: CalendarEvent) => (
								<div 
									key={event.id}
									onClick={() => setSelectedEvent(event)}
									className="p-3 rounded-lg border border-kumo-line bg-kumo-base hover:bg-kumo-tint cursor-pointer transition-colors"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="text-sm font-semibold text-kumo-default truncate pt-1">{event.title}</div>
										<EventMenu 
											onEdit={() => {
												setEditEvent({ ...event, contacts: event.contacts || [] });
												setIsEditEventOpen(true);
											}}
											onDelete={() => {
												setEventToDelete(event);
												setIsDeleteConfirmOpen(true);
											}}
										/>
									</div>
									<div className="text-xs text-kumo-subtle mt-0.5 flex items-center gap-1.5">
										<ClockIcon size={14} />
										<span>{formatShortTime(new Date(event.start_at))} - {formatShortTime(new Date(event.end_at))}</span>
									</div>
									<div className="text-xs text-kumo-subtle mt-1 flex items-center gap-1.5">
										<div className="w-[14px] flex justify-center">
											<div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
										</div>
										<span>{new Date(event.start_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
									</div>
									{event.contacts && event.contacts.length > 0 && (
										<div className="mt-3 flex flex-wrap gap-1.5">
											{event.contacts.slice(0, 3).map((contactId: string) => {
												const contact = contactsMap.get(contactId);
												if (!contact) return null;
												return (
													<div key={contact.id} className="flex items-center gap-1 bg-kumo-tint rounded-full py-0.5 pl-0.5 pr-2 border border-kumo-line">
														{contact.avatar_url ? (
															<img src={contact.avatar_url} alt="" className="w-4 h-4 rounded-full shrink-0" />
														) : (
															<UserCircleIcon className="w-4 h-4 text-kumo-subtle shrink-0" weight="fill" />
														)}
														<span className="text-[10px] font-medium text-kumo-strong truncate max-w-[100px]">{contact.name}</span>
													</div>
												);
											})}
											{event.contacts.length > 3 && (
												<div className="flex items-center justify-center bg-kumo-tint rounded-full px-2 py-0.5 border border-kumo-line">
													<span className="text-[10px] font-medium text-kumo-strong">+{event.contacts.length - 3}</span>
												</div>
											)}
										</div>
									)}
								</div>
							))
					)}
				</div>
			</div>

			{/* Column 3: Calendar */}
			<div className="flex flex-1 flex-col min-w-0 bg-kumo-base relative z-0">
				{/* Header */}
			<div className="flex flex-col gap-3 px-4 py-3 border-b border-kumo-line shrink-0">
				<div className="flex items-center justify-between">
					<h1 className="text-lg font-semibold text-kumo-default">{formatMonthYear(currentDate)}</h1>
					<Button variant="primary" icon={<CalendarPlusIcon size={16} />} onClick={() => setIsNewEventOpen(true)}>
						<span className="hidden sm:inline">New event</span>
					</Button>
				</div>
				<div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
					<div className="flex items-center gap-1 bg-kumo-control rounded-md p-0.5">
						<Button variant="ghost" size="sm" onClick={prevRange} icon={<CaretLeftIcon size={16} />} aria-label="Previous" />
						<Button variant="ghost" size="sm" onClick={today}>Today</Button>
						<Button variant="ghost" size="sm" onClick={nextRange} icon={<CaretRightIcon size={16} />} aria-label="Next" />
					</div>
					<div className="flex items-center gap-1 bg-kumo-control rounded-md p-0.5">
						<Button variant="ghost" size="sm" onClick={() => setView('day')} className={view === 'day' ? 'bg-kumo-base shadow-sm' : ''}>Day</Button>
						<Button variant="ghost" size="sm" onClick={() => setView('week')} className={view === 'week' ? 'bg-kumo-base shadow-sm' : ''}>Week</Button>
						<Button variant="ghost" size="sm" onClick={() => setView('month')} className={view === 'month' ? 'bg-kumo-base shadow-sm' : ''}>Month</Button>
					</div>
				</div>
			</div>

			{/* Main Grid */}
			<div className="flex flex-1 min-h-0">
				<div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
					{view === 'month' ? (
						<div className="flex flex-col h-full">
							{/* Month Days Header */}
							<div className="flex border-b border-kumo-line sticky top-0 bg-kumo-base z-10 shrink-0">
								{Array.from({ length: 7 }, (_, i) => addDays(startDate, i)).map((day, i) => (
									<div key={i} className="flex-1 min-w-0 border-l border-kumo-line py-2 text-center text-xs text-kumo-subtle uppercase tracking-wider">
										{formatDayName(day)}
									</div>
								))}
							</div>
							
							{/* Month Grid */}
							<div className="flex-1 grid grid-cols-7 auto-rows-[minmax(100px,_1fr)]">
								{days.map((day, dayIdx) => {
									const isCurrentMonth = day.getMonth() === currentDate.getMonth();
									return (
										<div key={dayIdx} className={`border-l border-b border-kumo-line p-1 relative flex flex-col ${!isCurrentMonth ? 'bg-kumo-tint/50' : isSameDay(day, new Date()) ? 'bg-indigo-50/50' : ''}`}>
											<div className={`text-sm font-medium text-right mb-1 mr-1 ${isSameDay(day, new Date()) ? 'text-indigo-600 font-bold' : isCurrentMonth ? 'text-kumo-default' : 'text-kumo-subtle'}`}>
												{formatDayNum(day)}
											</div>
											<div className="flex-1 overflow-y-auto space-y-1">
												{events.filter((e: CalendarEvent) => isSameDay(new Date(e.start_at), day)).map((event: CalendarEvent) => (
													<div 
														key={event.id}
														onClick={() => setSelectedEvent(event)}
														className="rounded bg-kumo-brand/20 border border-kumo-brand/30 hover:bg-kumo-brand/30 px-1 py-0.5 cursor-pointer transition-colors truncate text-[10px] text-kumo-brand font-medium"
													>
														{formatShortTime(new Date(event.start_at))} {event.title}
													</div>
												))}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					) : (
						<>
							{/* Days Header */}
							<div className="flex border-b border-kumo-line sticky top-0 bg-kumo-base z-10 shrink-0 ml-10 sm:ml-12">
								{days.map((day, i) => (
									<div key={i} className="flex-1 min-w-[40px] sm:min-w-[100px] border-l border-kumo-line py-2 text-center">
										<div className="text-[10px] sm:text-xs text-kumo-subtle uppercase tracking-wider">{formatDayName(day)}</div>
										<div className={`text-base sm:text-lg font-medium mt-0.5 ${isSameDay(day, new Date()) ? 'text-kumo-brand bg-kumo-brand/10 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mx-auto' : 'text-kumo-default'}`}>
											{formatDayNum(day)}
										</div>
									</div>
								))}
							</div>

							{/* Time Grid */}
							<div className="flex flex-1 relative w-full">
								{/* Time labels */}
								<div className="w-10 sm:w-12 shrink-0 border-r border-kumo-line bg-kumo-base sticky left-0 z-10 flex flex-col">
									{hours.map(hour => (
										<div key={hour} className="h-16 border-b border-kumo-line flex items-start justify-center pt-1 text-[10px] sm:text-xs text-kumo-subtle">
											{hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
										</div>
									))}
								</div>

								{/* Grid Cells & Events */}
								<div className="flex-1 flex relative">
									{days.map((day, dayIdx) => (
										<div key={dayIdx} className="flex-1 border-r border-kumo-line relative min-w-[40px] sm:min-w-[100px]">
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
						</>
					)}
				</div>
			</div>
		</div>
	</div>

	{mounted ? createPortal(
		<>
			{/* Side Panel for Event Details (Sheet) */}
			{selectedEvent && (
				<div className="fixed inset-0 z-[100] overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
					<div className="absolute inset-0 bg-black/30 transition-opacity" onClick={() => setSelectedEvent(null)} />
					<div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
						<div className="pointer-events-auto w-screen max-w-sm">
							<div className="flex h-full flex-col overflow-y-auto bg-white shadow-xl border-l border-kumo-line animate-in slide-in-from-right-full duration-300">
								<div className="p-4 border-b border-kumo-line flex items-center justify-between">
									<h2 className="font-semibold text-kumo-default">Event Details</h2>
									<Button variant="ghost" size="sm" shape="square" icon={<XIcon />} onClick={() => setSelectedEvent(null)} aria-label="Close" />
								</div>
								<div className="p-6 space-y-6 flex-1">
									<div>
										<div className="flex items-start justify-between gap-4">
											<h3 className="text-2xl font-bold text-kumo-default tracking-tight break-words">{selectedEvent.title}</h3>
											<EventMenu 
												onEdit={() => {
													setEditEvent({...selectedEvent, contacts: selectedEvent.contacts || []});
													setSelectedEvent(null);
													setIsEditEventOpen(true);
												}}
												onDelete={() => {
													setEventToDelete(selectedEvent);
													setSelectedEvent(null);
													setIsDeleteConfirmOpen(true);
												}}
											/>
										</div>
										<div className="flex items-center gap-2 text-kumo-subtle mt-3 text-sm font-medium">
											<ClockIcon size={18} />
											<span>
												{formatDateTime(new Date(selectedEvent.start_at))} - {formatDateTime(new Date(selectedEvent.end_at))}
											</span>
										</div>
									</div>
									{selectedEvent.description && (
										<div className="pt-6 border-t border-kumo-line">
											<h4 className="text-xs font-bold text-kumo-strong uppercase tracking-wider mb-3">Description</h4>
											<p className="text-sm text-kumo-default whitespace-pre-wrap leading-relaxed">{selectedEvent.description}</p>
										</div>
									)}
									{selectedEvent.contacts && selectedEvent.contacts.length > 0 && (
										<div className="pt-6 border-t border-kumo-line">
											<h4 className="text-xs font-bold text-kumo-strong uppercase tracking-wider mb-3">Attendees</h4>
											<div className="flex flex-col gap-3">
												{selectedEvent.contacts.map((contactId: string) => {
													const contact = contactsMap.get(contactId);
													if (!contact) return null;
													return (
														<div key={contact.id} className="flex items-center gap-3">
															{contact.avatar_url ? (
																<img src={contact.avatar_url} alt="" className="w-8 h-8 rounded-full shrink-0" />
															) : (
																<UserCircleIcon className="w-8 h-8 text-kumo-subtle shrink-0" weight="fill" />
															)}
															<div className="flex flex-col min-w-0">
																<span className="text-sm font-medium text-kumo-strong truncate">{contact.name}</span>
																<span className="text-xs text-kumo-subtle truncate">{contact.email}</span>
															</div>
														</div>
													);
												})}
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{isDeleteConfirmOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
					<div className="absolute inset-0 bg-black/30 transition-opacity" onClick={() => setIsDeleteConfirmOpen(false)} />
					<div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm pointer-events-auto p-6 animate-in fade-in zoom-in-95 duration-200">
						<h2 className="text-lg font-bold text-kumo-default mb-2">Delete Event</h2>
						<p className="text-sm text-kumo-subtle mb-6">Are you sure you want to delete this event? This action cannot be undone.</p>
						<div className="flex justify-end gap-2">
							<Button variant="secondary" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
							<Button variant="destructive" loading={deleteEventMutation.isPending} onClick={async () => {
								if (eventToDelete) {
									await handleDeleteEvent(eventToDelete.id);
									setIsDeleteConfirmOpen(false);
								}
							}}>Delete</Button>
						</div>
					</div>
				</div>
			)}

			{/* New Event Modal */}
			{isNewEventOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
					<div className="absolute inset-0 bg-black/30 transition-opacity" onClick={() => setIsNewEventOpen(false)} />
					<div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
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
							<div className="flex flex-col sm:flex-row gap-4">
								<div className="flex-1 min-w-0">
									<Input 
										label="Start" 
										type="datetime-local" 
										required 
										value={newEvent.start_at} 
										onChange={e => setNewEvent({...newEvent, start_at: e.target.value})} 
									/>
								</div>
								<div className="flex-1 min-w-0">
									<Input 
										label="End" 
										type="datetime-local" 
										required 
										value={newEvent.end_at} 
										onChange={e => setNewEvent({...newEvent, end_at: e.target.value})} 
									/>
								</div>
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
							<ContactSelector 
								mailboxId={mailboxId}
								selectedContacts={newEvent.contacts}
								onChange={(contacts) => setNewEvent({ ...newEvent, contacts })}
							/>
							<div className="pt-4 flex justify-end gap-2">
								<Button type="button" variant="secondary" onClick={() => setIsNewEventOpen(false)}>Cancel</Button>
								<Button variant="primary" type="submit" disabled={createEventMutation.isPending}>
									{createEventMutation.isPending ? "Saving..." : "Save"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Edit Event Modal */}
			{isEditEventOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
					<div className="absolute inset-0 bg-black/30 transition-opacity" onClick={() => setIsEditEventOpen(false)} />
					<div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
						<div className="p-4 border-b border-kumo-line flex items-center justify-between">
							<h2 className="font-semibold text-kumo-default">Edit Event</h2>
							<Button variant="ghost" size="sm" shape="square" icon={<XIcon />} onClick={() => setIsEditEventOpen(false)} aria-label="Close" />
						</div>
						{editEvent && (
							<form onSubmit={handleUpdateEvent} className="p-4 space-y-4">
								<Input 
									label="Title" 
									required 
									value={editEvent.title} 
									onChange={e => setEditEvent({...editEvent, title: e.target.value})} 
								/>
								<div className="flex flex-col sm:flex-row gap-4">
									<div className="flex-1 min-w-0">
										<Input 
											label="Start" 
											type="datetime-local" 
											required 
											value={editEvent.start_at ? new Date(editEvent.start_at).toISOString().slice(0, 16) : ""} 
											onChange={(e) => setEditEvent({...editEvent, start_at: e.target.value})} 
										/>
									</div>
									<div className="flex-1 min-w-0">
										<Input 
											label="End" 
											type="datetime-local" 
											required 
											value={editEvent.end_at ? new Date(editEvent.end_at).toISOString().slice(0, 16) : ""} 
											onChange={(e) => setEditEvent({...editEvent, end_at: e.target.value})} 
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-kumo-default mb-1">Description</label>
									<textarea 
										className="w-full rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm text-kumo-default focus:border-kumo-brand focus:outline-none focus:ring-1 focus:ring-kumo-brand resize-none"
										rows={3}
										value={editEvent.description || ""}
										onChange={e => setEditEvent({...editEvent, description: e.target.value})}
									/>
								</div>
								<ContactSelector 
									mailboxId={mailboxId}
									selectedContacts={editEvent.contacts || []}
									onChange={(contacts) => setEditEvent({ ...editEvent, contacts })}
								/>
								<div className="pt-4 flex justify-end gap-2">
									<Button type="button" variant="secondary" onClick={() => setIsEditEventOpen(false)}>Cancel</Button>
									<Button variant="primary" type="submit" disabled={updateEventMutation.isPending}>
										{updateEventMutation.isPending ? "Saving..." : "Save Changes"}
									</Button>
								</div>
							</form>
						)}
					</div>
				</div>
			)}
		</>,
		document.body
	) : null}
		</>
	);
}
