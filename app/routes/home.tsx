// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import {
	Button,
	Dialog,
	Empty,
	Input,
	Loader,
	Select,
	Text,
	useKumoToastManager,
} from "@cloudflare/kumo";
import { EnvelopeIcon, PlusIcon, TrashIcon, UserIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";
import api from "~/services/api";
import { safeGetStorage } from "~/lib/utils";
import {
	useCreateMailbox,
	useDeleteMailbox,
	useMailboxes,
} from "~/queries/mailboxes";
import { useFolders } from "~/queries/folders";
import { useEmails, useUpdateEmail, useMarkThreadRead } from "~/queries/emails";
import { Folders } from "shared/folders";
import { queryKeys } from "~/queries/keys";
import type { Email } from "~/types";

export function meta() {
	return [{ title: "Epistle" }];
}

export default function HomeRoute() {
	const toastManager = useKumoToastManager();
	const { data: mailboxes = [], refetch: refetchMailboxes, isFetched: mailboxesFetched } = useMailboxes();
	const createMailbox = useCreateMailbox();
	const deleteMailbox = useDeleteMailbox();

	const { data: configData } = useQuery({
		queryKey: queryKeys.config,
		queryFn: () => api.getConfig(),
		staleTime: Infinity, // config rarely changes
	});

	const domains = configData?.domains ?? [];
	const emailAddresses = configData?.emailAddresses ?? [];

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [newPrefix, setNewPrefix] = useState("");
	const [selectedDomain, setSelectedDomain] = useState("");
	const [newName, setNewName] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [mailboxToDelete, setMailboxToDelete] = useState<{
		id: string;
		email: string;
	} | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// Set default domain when config loads
	useEffect(() => {
		if (domains.length > 0 && !selectedDomain) {
			setSelectedDomain(domains[0]);
		}
	}, [domains, selectedDomain]);

	// Auto-create mailboxes from config (run once when both data sources are ready)
	const autoCreateDone = useRef(false);
	useEffect(() => {
		if (autoCreateDone.current) return;
		if (emailAddresses.length === 0 || !mailboxesFetched) return;
		const existingEmails = new Set(
			mailboxes.map((m) => m.email.toLowerCase()),
		);
		const toCreate = emailAddresses.filter(
			(addr) => !existingEmails.has(addr.toLowerCase()),
		);
		if (toCreate.length === 0) {
			autoCreateDone.current = true;
			return;
		}
		autoCreateDone.current = true;
		let cancelled = false;
		Promise.all(
			toCreate.map((addr) => {
				const localPart = addr.split("@")[0] || addr;
				return api.createMailbox(addr, localPart).catch(() => {});
			}),
		).then(() => { if (!cancelled) refetchMailboxes(); });
		return () => { cancelled = true; };
	}, [emailAddresses, mailboxes, refetchMailboxes]);

	const handleCreate = async (e: FormEvent) => {
		e.preventDefault();
		setCreateError(null);
		if (!newPrefix || !selectedDomain) {
			setCreateError("Please fill in all fields");
			return;
		}
		const email = `${newPrefix}@${selectedDomain}`;
		const name = newName || newPrefix;
		setIsCreating(true);
		try {
			await createMailbox.mutateAsync({ email, name });
			toastManager.add({ title: "Mailbox created successfully!" });
			setIsCreateOpen(false);
			setNewPrefix("");
			setNewName("");
		} catch (err: unknown) {
			const message = (err instanceof Error ? err.message : null) || "Failed to create mailbox";
			setCreateError(message);
		} finally {
			setIsCreating(false);
		}
	};

	const handleDelete = async () => {
		if (!mailboxToDelete) return;
		setIsDeleting(true);
		try {
			await deleteMailbox.mutateAsync(mailboxToDelete.id);
			toastManager.add({ title: "Mailbox deleted" });
			setIsDeleteOpen(false);
			setMailboxToDelete(null);
		} catch {
			toastManager.add({ title: "Failed to delete mailbox", variant: "error" });
		} finally {
			setIsDeleting(false);
		}
	};

	const isConfigured = emailAddresses.length > 0;
	const accounts = isConfigured
		? emailAddresses.map((addr) => ({
				id: addr,
				email: addr,
				name: addr.split("@")[0] || addr,
			}))
		: mailboxes;

	const isLoading = !configData;
	const [lastMailbox, setLastMailbox] = useState<string | null>(null);

	useEffect(() => {
		setLastMailbox(safeGetStorage("last_mailbox"));
	}, []); // safeGetStorage is a stable imported function

	const defaultAccount = accounts.find((a) => a.id === lastMailbox) || (accounts.length > 0 ? accounts[0] : null);

	const [isManageOpen, setIsManageOpen] = useState(false);
	const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
	const avatarMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isAvatarMenuOpen) return;
		const handler = (e: MouseEvent) => {
			if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
				setIsAvatarMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [isAvatarMenuOpen]);

	const { data: folders = [] } = useFolders(defaultAccount?.id);
	const inboxFolder = folders.find(f => f.id === Folders.INBOX);
	const unreadCount = inboxFolder?.unreadCount || 0;

	const { data: priorityEmailsData } = useEmails(defaultAccount?.id, { folder: Folders.INBOX, limit: "3" });
	const priorityEmails = priorityEmailsData?.emails || [];

	const updateEmail = useUpdateEmail();
	const markThreadRead = useMarkThreadRead();

	const handleEmailClick = (email: Email) => {
		if (defaultAccount?.id && !email.read) {
			if (email.thread_id && email.thread_count && email.thread_count > 1) {
				markThreadRead.mutate({
					mailboxId: defaultAccount.id,
					threadId: email.thread_id,
				});
			} else {
				updateEmail.mutate({
					mailboxId: defaultAccount.id,
					id: email.id,
					data: { read: true },
				});
			}
		}
	};

	return (
		<div className="min-h-screen bg-kumo-recessed flex items-center justify-center">
			{/* Top Navigation */}
			<div className="fixed top-0 left-0 right-0 h-16 bg-kumo-base/70 backdrop-blur border-b border-kumo-line flex items-center justify-between px-6 z-40">
				<div className="font-semibold text-lg text-kumo-default">Epistle</div>
				<div className="relative" ref={avatarMenuRef}>
					<button
						type="button"
						className="flex items-center justify-center h-10 w-10 rounded-full bg-kumo-fill hover:bg-kumo-overlay transition-colors border-0 cursor-pointer"
						onClick={() => setIsAvatarMenuOpen((o) => !o)}
					>
						{defaultAccount ? (
							<span className="text-sm font-bold text-kumo-default">
								{defaultAccount.name.charAt(0).toUpperCase()}
							</span>
						) : (
							<UserIcon size={20} className="text-kumo-strong" />
						)}
					</button>
					
					{isAvatarMenuOpen && (
						<div className="absolute top-full right-0 mt-2 w-72 rounded-xl border border-kumo-line bg-kumo-elevated shadow-xl py-5 z-50 flex flex-col items-center">
							<div className="text-base font-medium text-kumo-default truncate w-full text-center px-4 mb-1">
								{defaultAccount?.email || "No Mailbox"}
							</div>
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-kumo-fill text-2xl font-bold text-kumo-default my-3">
								{defaultAccount ? defaultAccount.name.charAt(0).toUpperCase() : <UserIcon size={32} />}
							</div>
							<div className="text-sm text-kumo-subtle truncate w-full text-center px-4 mb-4">
								Hi, {defaultAccount?.name || "User"}!
							</div>
							<div className="w-full px-4">
								<Button
									variant="secondary"
									className="w-full rounded-full"
									onClick={() => {
										setIsAvatarMenuOpen(false);
										setIsManageOpen(true);
									}}
								>
									Manage your Mailboxes
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-16 text-center w-full mt-16">
				{isLoading ? (
					<div className="flex justify-center py-20">
						<Loader size="lg" />
					</div>
				) : (
					<div className="flex flex-col items-center">
						<h1 className="text-4xl md:text-5xl font-bold text-kumo-default mb-4">
							Good Morning!
						</h1>
						<h2 className="text-xl md:text-2xl text-kumo-subtle mb-10">
							{accounts.length > 0 
								? "Let's check your Inbox" 
								: "Let's get started by creating an Inbox"}
						</h2>
						
						{accounts.length > 0 ? (
							defaultAccount && (
								<RouterLink to={`/mailbox/${defaultAccount.id}/emails/inbox`} className="no-underline">
									<Button variant="primary" size="lg" className="rounded-full px-8 py-4 text-lg shadow-lg">
										Check Inbox
									</Button>
								</RouterLink>
							)
						) : (
							<Button 
								variant="primary" 
								size="lg" 
								className="rounded-full px-8 py-4 text-lg shadow-lg"
								onClick={() => setIsCreateOpen(true)}
							>
								Create Mailbox
							</Button>
						)}

						{accounts.length > 0 && defaultAccount && (
							<div className="mt-12 w-full max-w-lg text-left">
								<div className="text-center mb-4">
									<h3 className="text-sm font-medium text-kumo-subtle">
										{unreadCount} unread email{unreadCount !== 1 ? "s" : ""}
									</h3>
									<p className="text-xs text-kumo-subtle mt-1">Priority emails</p>
								</div>
								{priorityEmails.length > 0 ? (
									<div className="rounded-xl border border-kumo-line bg-kumo-base overflow-hidden shadow-sm">
										{priorityEmails.map((email, idx) => (
											<RouterLink
												key={email.id}
												to={`/mailbox/${defaultAccount.id}/emails/inbox?selected=${email.id}`}
												onClick={() => handleEmailClick(email)}
												className={`group flex items-center gap-4 px-4 py-3 no-underline transition-colors hover:bg-kumo-tint ${
													idx > 0 ? "border-t border-kumo-line" : ""
												}`}
											>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-2 mb-0.5">
														{!email.read && <div className="h-2 w-2 rounded-full bg-kumo-brand shrink-0" />}
														<div className="text-sm font-medium text-kumo-default truncate">
															{email.sender.split("@")[0]}
														</div>
														<div className="text-xs text-kumo-subtle shrink-0 ml-auto">
															{new Date(email.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
														</div>
													</div>
													<div className={`text-sm truncate ${!email.read ? "font-medium text-kumo-default" : "text-kumo-subtle"}`}>
														{email.subject || "(No subject)"}
													</div>
												</div>
											</RouterLink>
										))}
									</div>
								) : (
									<div className="rounded-xl border border-kumo-line bg-kumo-base py-8 px-4 text-center">
										<p className="text-sm text-kumo-subtle">No recent emails</p>
									</div>
								)}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Manage Mailboxes Dialog */}
			<Dialog.Root open={isManageOpen} onOpenChange={setIsManageOpen}>
				<Dialog size="sm" className="p-6">
					<Dialog.Title className="text-base font-semibold mb-4">
						Manage Mailboxes
					</Dialog.Title>
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-sm text-kumo-subtle">
								{accounts.length} mailbox{accounts.length !== 1 ? "es" : ""}
							</span>
							{!isConfigured && (
								<Button
									variant="ghost"
									size="sm"
									icon={<PlusIcon size={14} />}
									onClick={() => {
										setIsManageOpen(false);
										setIsCreateOpen(true);
									}}
								>
									New
								</Button>
							)}
						</div>
						<div className="rounded-xl border border-kumo-line bg-kumo-base overflow-hidden max-h-64 overflow-y-auto">
							{accounts.map((account, idx) => (
								<RouterLink
									key={account.id}
									to={`/mailbox/${account.id}`}
									className={`group flex items-center gap-4 px-4 py-3 no-underline transition-colors hover:bg-kumo-tint ${
										idx > 0 ? "border-t border-kumo-line" : ""
									}`}
								>
									<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kumo-fill text-xs font-bold text-kumo-default">
										{account.name.charAt(0).toUpperCase()}
									</div>
									<div className="min-w-0 flex-1">
										<div className="text-sm font-medium text-kumo-default truncate">
											{account.name}
										</div>
										<div className="text-xs text-kumo-subtle truncate">
											{account.email}
										</div>
									</div>
									{!isConfigured && (
										<Button
											variant="ghost"
											size="sm"
											shape="square"
											icon={<TrashIcon size={14} />}
											aria-label={`Delete mailbox ${account.email}`}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setMailboxToDelete({
													id: account.id,
													email: account.email,
												});
												setIsDeleteOpen(true);
											}}
										/>
									)}
								</RouterLink>
							))}
						</div>
					</div>
					<div className="mt-6 flex justify-end">
						<Dialog.Close
							render={(props) => (
								<Button {...props} variant="secondary" size="sm">
									Done
								</Button>
							)}
						/>
					</div>
				</Dialog>
			</Dialog.Root>

			{/* Create Dialog */}
			<Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<Dialog size="sm" className="p-6">
					<Dialog.Title className="text-base font-semibold mb-5">
						Create New Mailbox
					</Dialog.Title>
					<form onSubmit={handleCreate} className="space-y-4">
						{createError && (
							<Text variant="error" size="sm">
								{createError}
							</Text>
						)}
						<div>
							<span className="text-sm font-medium text-kumo-default mb-1.5 block">
								Email Address
							</span>
							<div className="flex items-center gap-2">
								<div className="flex-1">
									<Input
										aria-label="Address prefix"
										placeholder="info"
										size="sm"
										value={newPrefix}
										onChange={(e) => setNewPrefix(e.target.value)}
										required
									/>
								</div>
								<span className="text-sm text-kumo-subtle">@</span>
								{domains.length > 1 ? (
									<div className="flex-1">
							<Select
								aria-label="Domain"
								value={selectedDomain}
								onValueChange={(value) => {
									if (value) setSelectedDomain(value);
								}}
							>
											{domains.map((d) => (
												<Select.Option key={d} value={d}>
													{d}
												</Select.Option>
											))}
										</Select>
									</div>
								) : (
									<span className="text-sm text-kumo-subtle">
										{selectedDomain || "no domain"}
									</span>
								)}
							</div>
						</div>
						<Input
							label="Display Name (optional)"
							placeholder="Info"
							size="sm"
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
						/>
						<div className="flex justify-end gap-2 pt-2">
							<Dialog.Close
								render={(props) => (
									<Button {...props} variant="secondary" size="sm">
										Cancel
									</Button>
								)}
							/>
							<Button
								type="submit"
								variant="primary"
								size="sm"
								loading={isCreating}
								disabled={!selectedDomain}
							>
								Create
							</Button>
						</div>
					</form>
				</Dialog>
			</Dialog.Root>

			{/* Delete Dialog */}
			<Dialog.Root
				open={isDeleteOpen}
				onOpenChange={(open) => {
					setIsDeleteOpen(open);
					if (!open) setMailboxToDelete(null);
				}}
			>
				<Dialog size="sm" className="p-6">
					<Dialog.Title className="text-base font-semibold mb-2">
						Delete Mailbox
					</Dialog.Title>
					<Dialog.Description className="text-kumo-subtle text-sm mb-5">
						Are you sure you want to delete{" "}
						<strong className="text-kumo-default">
							{mailboxToDelete?.email}
						</strong>
						? This action cannot be undone.
					</Dialog.Description>
					<div className="flex justify-end gap-2">
						<Dialog.Close
							render={(props) => (
								<Button {...props} variant="secondary" size="sm">
									Cancel
								</Button>
							)}
						/>
						<Button
							variant="destructive"
							size="sm"
							loading={isDeleting}
							onClick={handleDelete}
						>
							Delete
						</Button>
					</div>
				</Dialog>
			</Dialog.Root>
		</div>
	);
}
