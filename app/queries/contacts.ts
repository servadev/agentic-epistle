import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "~/services/api";
import type { Contact } from "~/types";

export const queryKeys = {
	contacts: {
		all: ["contacts"] as const,
		list: (mailboxId: string) => [...queryKeys.contacts.all, mailboxId, "list"] as const,
		detail: (mailboxId: string, id: string) => [...queryKeys.contacts.all, mailboxId, "detail", id] as const,
	},
};

export function useContacts(
	mailboxId: string | undefined,
	options?: { enabled?: boolean; refetchInterval?: number }
) {
	return useQuery({
		queryKey: mailboxId ? queryKeys.contacts.list(mailboxId) : ["contacts", "_disabled"],
		queryFn: () => api.listContacts(mailboxId!),
		enabled: !!mailboxId && (options?.enabled ?? true),
		refetchInterval: options?.refetchInterval,
	});
}

export function useContact(
	mailboxId: string | undefined,
	id: string | undefined,
	options?: { enabled?: boolean }
) {
	return useQuery({
		queryKey: mailboxId && id ? queryKeys.contacts.detail(mailboxId, id) : ["contacts", "_disabled"],
		queryFn: () => api.getContact(mailboxId!, id!),
		enabled: !!mailboxId && !!id && (options?.enabled ?? true),
	});
}

export function useCreateContact() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ mailboxId, contact }: { mailboxId: string; contact: Partial<Contact> }) =>
			api.createContact(mailboxId, contact),
		onSuccess: (_data, { mailboxId }) => {
			qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
		},
	});
}

export function useUpdateContact() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ mailboxId, id, contact }: { mailboxId: string; id: string; contact: Partial<Contact> }) =>
			api.updateContact(mailboxId, id, contact),
		onSuccess: (_data, { mailboxId, id }) => {
			qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
		},
	});
}

export function useDeleteContact() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ mailboxId, id }: { mailboxId: string; id: string }) =>
			api.deleteContact(mailboxId, id),
		onSuccess: (_data, { mailboxId }) => {
			qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
		},
	});
}
