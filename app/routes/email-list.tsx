// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Button, Pagination, Tooltip } from "@cloudflare/kumo";
import {
	ArchiveIcon,
	ArrowBendUpLeftIcon,
	ArrowsClockwiseIcon,
	EnvelopeOpenIcon,
	EnvelopeSimpleIcon,
	FileIcon,
	PaperPlaneTiltIcon,
	PencilSimpleIcon,
	StarIcon,
	TrashIcon,
	TrayIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { Folders } from "shared/folders";
import { formatListDate, formatShortDate } from "shared/dates";
import MailboxSplitView from "~/components/MailboxSplitView";
import { getSnippetText } from "~/lib/utils";
import {
	useDeleteEmail,
	useEmails,
	useMarkThreadRead,
	useUpdateEmail,
} from "~/queries/emails";
import { useFolders } from "~/queries/folders";
import { queryKeys } from "~/queries/keys";
import { useUIStore } from "~/hooks/useUIStore";
import type { Email } from "~/types";

const PAGE_SIZE = 25;

const FOLDER_EMPTY_STATES: Record<
	string,
	{
		icon: React.ReactNode;
		title: string;
		description: string;
		showCompose?: boolean;
	}
> = {
	[Folders.INBOX]: {
		icon: <TrayIcon size={48} weight="thin" className="text-kumo-subtle" />,
		title: "Your inbox is empty",
		description:
			"New emails will appear here when they arrive. Send an email to get the conversation started.",
		showCompose: true,
	},
	[Folders.SENT]: {
		icon: (
			<PaperPlaneTiltIcon size={48} weight="thin" className="text-kumo-subtle" />
		),
		title: "No sent emails",
		description: "Emails you send will show up here.",
		showCompose: true,
	},
	[Folders.DRAFT]: {
		icon: <FileIcon size={48} weight="thin" className="text-kumo-subtle" />,
		title: "No drafts",
		description: "Emails you're still working on will be saved here.",
		showCompose: true,
	},
	[Folders.ARCHIVE]: {
		icon: <ArchiveIcon size={48} weight="thin" className="text-kumo-subtle" />,
		title: "Archive is empty",
		description:
			"Move emails here to keep your inbox clean without deleting them.",
	},
	[Folders.TRASH]: {
		icon: <TrashIcon size={48} weight="thin" className="text-kumo-subtle" />,
		title: "Trash is empty",
		description:
			"Deleted emails will appear here. You can restore them or permanently delete them.",
	},
};

function EmailListSkeleton() {
	return (
		<div className="animate-pulse space-y-1 p-2">
			{Array.from({ length: 8 }).map((_, i) => (
				<div key={i} className="flex items-center gap-3 px-3 py-3">
					<div className="w-4 h-4 rounded bg-kumo-fill" />
					<div className="w-5 h-5 rounded bg-kumo-fill" />
					<div className="flex-1 space-y-2">
						<div className="flex items-center gap-2">
							<div className="h-3 w-24 rounded bg-kumo-fill" />
							<div className="h-3 w-4 rounded bg-kumo-fill" />
							<div className="h-3 flex-1 rounded bg-kumo-fill" />
							<div className="h-3 w-12 rounded bg-kumo-fill" />
						</div>
						<div className="h-2.5 w-3/4 rounded bg-kumo-fill" />
					</div>
				</div>
			))}
		</div>
	);
}

function FolderEmptyState({
	folder,
	onCompose,
}: {
	folder?: string;
	onCompose: () => void;
}) {
	const config = (folder && FOLDER_EMPTY_STATES[folder]) || {
		icon: (
			<EnvelopeSimpleIcon size={48} weight="thin" className="text-kumo-subtle" />
		),
		title: "No emails",
		description: "This folder is empty.",
	};

	return (
		<div className="flex flex-col items-center justify-center py-24 px-6 text-center">
			<div className="mb-4">{config.icon}</div>
			<h3 className="text-base font-semibold text-kumo-default mb-1.5">
				{config.title}
			</h3>
			<p className="text-sm text-kumo-subtle max-w-xs mb-5">
				{config.description}
			</p>
			{"showCompose" in config && config.showCompose && (
				<Button
					variant="primary"
					size="sm"
					icon={<PencilSimpleIcon size={16} />}
					onClick={onCompose}
				>
					Compose
				</Button>
			)}
		</div>
	);
}

// Helper for date grouping
function getGroupHeader(dateStr: string): string {
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return "Older";

	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	if (d.getTime() === today.getTime()) return "Today";
	if (d.getTime() === yesterday.getTime()) return "Yesterday";

	if (d.getFullYear() === today.getFullYear()) {
		return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
	}
	return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function EmailListRoute() {
	const { mailboxId, folder } = useParams<{
		mailboxId: string;
		folder: string;
	}>();
	const [searchParams, setSearchParams] = useSearchParams();
	const {
		selectedEmailId,
		isComposing,
		selectEmail,
		closePanel,
		startCompose,
	} = useUIStore();
	const [page, setPage] = useState(1);

	const queryClient = useQueryClient();
	const updateEmail = useUpdateEmail();
	const markThreadRead = useMarkThreadRead();
	const deleteEmail = useDeleteEmail();

	const params = useMemo(
		() => ({
			folder: folder || "",
			page: String(page),
			limit: String(PAGE_SIZE),
		}),
		[folder, page],
	);

	const {
		data: emailData,
		isFetching: isRefreshing,
	} = useEmails(mailboxId, params, { refetchInterval: 30_000 });

	const emails = emailData?.emails ?? [];
	const totalCount = emailData?.totalCount ?? 0;

	const { data: folders = [] } = useFolders(mailboxId);

	const folderName = useMemo(() => {
		const found = folders.find((f) => f.id === folder);
		if (found) return found.name;
		return folder ? folder.charAt(0).toUpperCase() + folder.slice(1) : "Inbox";
	}, [folders, folder]);

	const isPanelOpen = selectedEmailId !== null || isComposing;

	// Track folder identity to detect folder changes vs page changes
	const prevFolderRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		const folderChanged = prevFolderRef.current !== `${mailboxId}/${folder}`;
		prevFolderRef.current = `${mailboxId}/${folder}`;

		if (folderChanged) {
			closePanel();
			setPage(1);
		}
	}, [mailboxId, folder, closePanel]);

	// Handle ?selected= query param
	useEffect(() => {
		const selectedId = searchParams.get("selected");
		if (selectedId && selectedId !== selectedEmailId) {
			selectEmail(selectedId);
			// Clean up the URL immediately after selection to avoid sticky state
			setSearchParams((prev) => {
				prev.delete("selected");
				return prev;
			}, { replace: true });
		}
	}, [searchParams, selectedEmailId, selectEmail, setSearchParams]);

	const toggleStar = (e: React.MouseEvent, email: Email) => {
		e.preventDefault();
		e.stopPropagation();
		if (mailboxId)
			updateEmail.mutate({
				mailboxId,
				id: email.id,
				data: { starred: !email.starred },
			});
	};

	const handleDelete = (e: React.MouseEvent, emailId: string) => {
		e.preventDefault();
		e.stopPropagation();
		if (mailboxId) {
			const confirmed = window.confirm("Are you sure you want to delete this email?");
			if (!confirmed) return;
			deleteEmail.mutate({ mailboxId, id: emailId });
			if (selectedEmailId === emailId) closePanel();
		}
	};

	const handleRefresh = () => {
		if (mailboxId) {
			queryClient.invalidateQueries({ queryKey: ["emails", mailboxId] });
			queryClient.invalidateQueries({
				queryKey: queryKeys.folders.list(mailboxId),
			});
		}
	};

	// Thread-aware helpers
	const hasUnread = (email: Email): boolean => {
		if (email.thread_unread_count !== undefined) {
			return email.thread_unread_count > 0;
		}
		return !email.read;
	};

	const handleRowClick = (email: Email) => {
		selectEmail(email.id);
		if (mailboxId && hasUnread(email)) {
			if (email.thread_id && email.thread_count && email.thread_count > 1) {
				markThreadRead.mutate({
					mailboxId,
					threadId: email.thread_id,
				});
			} else {
				updateEmail.mutate({
					mailboxId,
					id: email.id,
					data: { read: true },
				});
			}
		}
	};

	const formatParticipants = (email: Email): string => {
		if (email.participants) {
			const names = email.participants
				.split(",")
				.map((p) => p.trim().split("@")[0])
				.filter((name, idx, arr) => arr.indexOf(name) === idx);
			if (names.length <= 3) return names.join(", ");
			return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
		}
		return email.sender.split("@")[0];
	};

	const groupedEmails = useMemo(() => {
		const groups: { header: string; emails: Email[] }[] = [];
		let currentHeader = "";

		emails.forEach((email) => {
			const header = getGroupHeader(email.date);
			if (header !== currentHeader) {
				groups.push({ header, emails: [email] });
				currentHeader = header;
			} else {
				groups[groups.length - 1].emails.push(email);
			}
		});
		return groups;
	}, [emails]);

	return (
		<MailboxSplitView
			selectedEmailId={selectedEmailId}
			isComposing={isComposing}
		>
				{/* Folder header */}
				<div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 shrink-0 md:px-5 bg-white">
					<h1 className="text-lg font-bold text-slate-900 tracking-tight">
						{folderName}
					</h1>
					<div className="flex items-center gap-1">
						{totalCount > 0 && (
							<span className="text-sm text-slate-500 mr-2 hidden sm:inline">
								{totalCount} conversation{totalCount !== 1 ? "s" : ""}
							</span>
						)}
						<Tooltip
							content={isRefreshing ? "Refreshing..." : "Refresh"}
							side="bottom"
							asChild
						>
							<Button
								variant="ghost"
								shape="square"
								size="sm"
								icon={
									<ArrowsClockwiseIcon
										size={18}
										className={isRefreshing ? "animate-spin" : ""}
									/>
								}
								onClick={handleRefresh}
								disabled={isRefreshing}
								aria-label="Refresh"
							/>
						</Tooltip>
					</div>
				</div>

				{/* Email rows */}
				<div className="flex-1 overflow-y-auto">
				{isRefreshing && emails.length === 0 ? (
					<EmailListSkeleton />
				) : emails.length > 0 ? (
						<div>
							{groupedEmails.map((group) => (
								<div key={group.header}>
									<div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
										{group.header}
									</div>
									{group.emails.map((email) => {
										const isSelected = selectedEmailId === email.id;
										const snippet = getSnippetText(email.snippet);
										return (
											<div
												key={email.id}
												role="button"
												tabIndex={0}
												onClick={() => handleRowClick(email)}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														handleRowClick(email);
													}
												}}
												className={`group relative flex items-start gap-3 w-full text-left cursor-pointer transition-colors border-b border-slate-200 py-3 md:py-4 ${
													isSelected 
														? `bg-indigo-50 border-l-4 border-l-indigo-600 pl-3 pr-4 md:pl-5 md:pr-6 ${isPanelOpen ? "md:pr-4 md:pl-3" : ""}`
														: `bg-white hover:bg-slate-50 px-4 md:px-6 ${isPanelOpen ? "md:px-4" : ""}`
												}`}
											>
												{/* Unread dot */}
												<div className="w-2.5 pt-2 shrink-0 flex justify-center">
													{hasUnread(email) && (
														<div className="h-2 w-2 rounded-full bg-teal-500" />
													)}
												</div>

												{/* Avatar */}
												<div className="pt-0.5 shrink-0">
													<div className="h-10 w-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-lg font-bold">
														{formatParticipants(email).charAt(0).toUpperCase()}
													</div>
												</div>

												{/* Content */}
												<div className="min-w-0 flex-1 flex flex-col gap-0.5">
													{/* Topic tag pills placeholder - if data had tags, render here */}
													<div className="flex gap-2 mb-1">
														<span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-inset ring-slate-200 shadow-sm uppercase tracking-wider">
															<span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
															Design
														</span>
													</div>

													<div className="flex items-center justify-between gap-2">
														<span
															className={`truncate text-sm ${hasUnread(email) ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}
														>
															{formatParticipants(email)}
														</span>
														<div className="flex items-center gap-2 shrink-0">
															<button
																type="button"
																className={`p-0.5 bg-transparent border-0 cursor-pointer ${email.starred ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"}`}
																onClick={(e) => {
																	e.stopPropagation();
																	toggleStar(e, email);
																}}
															>
																<StarIcon
																	size={14}
																	weight={email.starred ? "fill" : "regular"}
																	className={
																		email.starred
																			? "text-amber-500"
																			: "text-slate-400 hover:text-amber-500"
																	}
																/>
															</button>
															<span className={`text-xs ${hasUnread(email) ? "font-bold text-teal-600" : "text-slate-500"}`}>
																{formatShortDate(email.date)}
															</span>
														</div>
													</div>
													
													<div className="flex items-center gap-1.5">
														<span
															className={`truncate text-sm ${hasUnread(email) ? "font-bold text-slate-900" : "font-semibold text-slate-800"}`}
														>
															{email.subject}
														</span>
														{(email.thread_count ?? 1) > 1 && (
															<span className="shrink-0 text-[10px] text-slate-500 bg-slate-200 rounded-full px-1.5 py-0.5 font-bold">
																{email.thread_count}
															</span>
														)}
														{email.has_draft && (
															<span className="shrink-0 text-[10px] text-amber-600 bg-amber-100 rounded-sm px-1 font-bold uppercase tracking-wide">
																Draft
															</span>
														)}
													</div>

													<div className="text-sm text-slate-500 line-clamp-2 leading-relaxed mt-0.5">
														{snippet || <span className="italic text-slate-400">No content</span>}
													</div>
												</div>

												{/* Hover actions */}
												<div className="hidden group-hover:flex items-center shrink-0 absolute top-3 right-4 bg-white/90 backdrop-blur rounded-md shadow-sm border border-slate-200">
													<Tooltip content={email.read ? "Mark unread" : "Mark read"} asChild>
														<Button
															variant="ghost"
															shape="square"
															size="sm"
															icon={email.read ? <EnvelopeSimpleIcon size={14} /> : <EnvelopeOpenIcon size={14} />}
															onClick={(e) => {
																e.stopPropagation();
																if (mailboxId)
																	updateEmail.mutate({
																		mailboxId,
																		id: email.id,
																		data: { read: !email.read },
																	});
															}}
															aria-label={email.read ? "Mark unread" : "Mark read"}
														/>
													</Tooltip>
													<Tooltip content="Delete" asChild>
														<Button
															variant="ghost"
															shape="square"
															size="sm"
															icon={<TrashIcon size={14} />}
															onClick={(e) => handleDelete(e, email.id)}
															aria-label="Delete"
														/>
													</Tooltip>
												</div>
											</div>
										);
									})}
								</div>
							))}
						</div>
					) : (
						<FolderEmptyState
							folder={folder}
							onCompose={() => startCompose()}
						/>
					)}
				</div>

				{/* Pagination */}
				{totalCount > PAGE_SIZE && (
					<div className="flex justify-center py-3 border-t border-kumo-line shrink-0">
						<Pagination
							page={page}
							setPage={setPage}
							perPage={PAGE_SIZE}
							totalCount={totalCount}
						/>
					</div>
				)}
		</MailboxSplitView>
	);
}
