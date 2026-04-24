import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "~/services/api";
import type { CalendarEvent } from "~/types";

export const queryKeys = {
	calendar: {
		all: ["calendar"] as const,
		events: (mailboxId: string, params?: { start?: string; end?: string }) =>
			[...queryKeys.calendar.all, mailboxId, "events", params] as const,
	},
};

export function useEvents(
	mailboxId: string | undefined,
	params?: { start?: string; end?: string },
	options?: { enabled?: boolean; refetchInterval?: number }
) {
	return useQuery({
		queryKey: mailboxId
			? queryKeys.calendar.events(mailboxId, params)
			: ["calendar", "_disabled"],
		queryFn: () => api.listEvents(mailboxId!, params),
		enabled: !!mailboxId && (options?.enabled ?? true),
		refetchInterval: options?.refetchInterval,
	});
}

export function useCreateEvent() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			mailboxId,
			event,
		}: { mailboxId: string; event: Omit<CalendarEvent, "id"> }) =>
			api.createEvent(mailboxId, event),
		onSuccess: (_data, { mailboxId }) => {
			qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
		},
	});
}

export function useUpdateEvent() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			mailboxId,
			id,
			event,
		}: { mailboxId: string; id: string; event: Partial<Omit<CalendarEvent, "id">> }) =>
			api.updateEvent(mailboxId, id, event),
		onSuccess: (_data, { mailboxId }) => {
			qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
		},
	});
}

export function useDeleteEvent() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			mailboxId,
			id,
		}: { mailboxId: string; id: string }) =>
			api.deleteEvent(mailboxId, id),
		onSuccess: (_data, { mailboxId }) => {
			qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
		},
	});
}
