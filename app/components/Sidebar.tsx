// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Badge, Button, Dialog, Input, Tooltip } from "@cloudflare/kumo";
import {
	ArchiveIcon,
	CaretLeftIcon,
	FileIcon,
	FolderIcon,
	PaperPlaneTiltIcon,
	PencilSimpleIcon,
	PlusIcon,
	TrashIcon,
	TrayIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router";
import { Folders, SYSTEM_FOLDER_IDS } from "shared/folders";
import { useCreateFolder, useFolders } from "~/queries/folders";
import { useMailbox } from "~/queries/mailboxes";
import { useUIStore } from "~/hooks/useUIStore";

const FOLDER_ICONS: Record<string, React.ReactNode> = {
	[Folders.INBOX]: <TrayIcon size={18} weight="regular" />,
	[Folders.SENT]: <PaperPlaneTiltIcon size={18} weight="regular" />,
	[Folders.DRAFT]: <FileIcon size={18} weight="regular" />,
	[Folders.ARCHIVE]: <ArchiveIcon size={18} weight="regular" />,
	[Folders.TRASH]: <TrashIcon size={18} weight="regular" />,
};

const SYSTEM_FOLDER_LINKS = [
	{ id: Folders.INBOX, label: "Inbox" },
	{ id: Folders.SENT, label: "Sent" },
	{ id: Folders.DRAFT, label: "Drafts" },
	{ id: Folders.ARCHIVE, label: "Archive" },
	{ id: Folders.TRASH, label: "Trash" },
];

interface FolderLinkProps {
	to: string;
	icon: React.ReactNode;
	label: string;
	unreadCount?: number;
	onClick?: () => void;
	isCollapsed?: boolean;
}

function FolderLink({
	to,
	icon,
	label,
	unreadCount,
	onClick,
	isCollapsed,
}: FolderLinkProps) {
	return (
		<NavLink
			to={to}
			onClick={onClick}
			title={isCollapsed ? label : undefined}
			className={({ isActive }) =>
				`relative flex items-center ${isCollapsed ? "justify-center px-0 py-3 md:py-3 lg:py-2 lg:px-3 lg:justify-start lg:gap-3" : "gap-3 py-2 px-3"} rounded-lg text-sm font-medium transition-colors ${
					isActive
						? "bg-slate-200 text-slate-900 shadow-sm"
						: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
				}`
			}
		>
			<span className="shrink-0 flex items-center justify-center">{icon}</span>
			<span className={`truncate flex-1 ${isCollapsed ? "hidden lg:block" : "block"}`}>{label}</span>
			{unreadCount != null && unreadCount > 0 && (
				<Badge variant="secondary" className={`bg-slate-200 text-slate-700 ${isCollapsed ? "hidden lg:inline-flex" : "inline-flex"}`}>{unreadCount}</Badge>
			)}
			{isCollapsed && unreadCount != null && unreadCount > 0 && (
				<div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-600 lg:hidden" />
			)}
		</NavLink>
	);
}

export default function Sidebar() {
	const { mailboxId } = useParams<{ mailboxId: string }>();
	const navigate = useNavigate();
	const { data: folders = [] } = useFolders(mailboxId);
	const createFolderMutation = useCreateFolder();
	const { startCompose, openComposeModal, closeSidebar, isSidebarOpen, openSidebar } = useUIStore();
	const { data: currentMailbox } = useMailbox(mailboxId);
	const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
	const [newFolderName, setNewFolderName] = useState("");
	const location = useLocation();

	const isCollapsed = !isSidebarOpen;

	const customFolders = useMemo(
		() =>
			folders.filter((f) => !(SYSTEM_FOLDER_IDS as readonly string[]).includes(f.id)),
		[folders],
	);

	const getUnreadCount = (folderId: string) => {
		const found = folders.find((f) => f.id === folderId);
		return found?.unreadCount || 0;
	};

	const handleCreateFolder = (e: React.FormEvent) => {
		e.preventDefault();
		if (newFolderName.trim() && mailboxId) {
			createFolderMutation.mutate({ mailboxId, name: newFolderName.trim() });
			setNewFolderName("");
			setIsCreateFolderOpen(false);
		}
	};

	const displayName = useMemo(() => {
		if (!currentMailbox) return mailboxId?.split("@")[0] || "Mailbox";
		// Prefer settings.fromName > name > local part of email
		if (currentMailbox.settings?.fromName) {
			return currentMailbox.settings.fromName;
		}
		if (currentMailbox.name && currentMailbox.name !== currentMailbox.email) {
			return currentMailbox.name;
		}
		return currentMailbox.email.split("@")[0] || currentMailbox.name;
	}, [currentMailbox, mailboxId]);

	const handleNavClick = () => {
		// Close mobile sidebar on navigation
		closeSidebar();
	};

	return (
		<aside 
			className={`h-full bg-slate-50 flex flex-col shrink-0 border-r border-slate-200 transition-all duration-200 ${
				isSidebarOpen ? "w-64" : "w-64 md:w-[72px] lg:w-64"
			}`}
		>
			{/* Back + identity */}
			<div className={`pt-4 pb-1 ${isCollapsed ? "px-2 md:px-0 lg:px-4" : "px-4"}`}>
				<button
					type="button"
					onClick={() => {
						navigate("/");
						closeSidebar();
					}}
					className={`flex items-center text-slate-500 text-sm hover:text-slate-900 transition-colors mb-2.5 cursor-pointer bg-transparent border-0 p-0 ${
						isCollapsed ? "justify-center md:justify-center lg:justify-start gap-0 lg:gap-1.5" : "gap-1.5"
					}`}
				>
					<CaretLeftIcon size={14} />
					<span className={isCollapsed ? "hidden lg:inline" : ""}>Mailboxes</span>
				</button>
				<div className={`px-1 ${isCollapsed ? "hidden lg:block" : ""}`}>
					<div className="text-base font-semibold text-slate-900 truncate">
						{displayName}
					</div>
					<div className="text-sm text-slate-500 truncate mt-0.5">
						{currentMailbox?.email || mailboxId}
					</div>
				</div>
			</div>

			{/* Compose */}
			<div className={`py-3 ${isCollapsed ? "px-2 md:px-3 lg:px-3" : "px-3"}`}>
				<Button
					variant="primary"
					icon={<PencilSimpleIcon size={16} />}
					onClick={() => {
						if (location.pathname.includes("/emails/") || location.pathname.includes("/search")) {
							startCompose();
						} else {
							openComposeModal();
						}
					}}
					className={`bg-slate-700 hover:bg-slate-800 text-white shadow-md border-0 ${
						isCollapsed ? "w-full md:w-12 md:h-12 md:p-0 md:justify-center md:rounded-full lg:w-full lg:h-auto lg:p-2 lg:justify-start lg:rounded-md" : "w-full"
					}`}
					title="Compose"
				>
					<span className={isCollapsed ? "inline md:hidden lg:inline" : ""}>Compose</span>
				</Button>
			</div>

			{/* Navigation */}
			<nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
				{SYSTEM_FOLDER_LINKS.map((folder) => (
					<FolderLink
						key={folder.id}
						to={`/mailbox/${mailboxId}/emails/${folder.id}`}
						icon={FOLDER_ICONS[folder.id]}
						label={folder.label}
						unreadCount={getUnreadCount(folder.id)}
						onClick={handleNavClick}
						isCollapsed={isCollapsed}
					/>
				))}

				<div className="pt-2">
					<FolderLink
						to={`/mailbox/${mailboxId}/contacts`}
						icon={<UsersIcon size={18} weight="regular" />}
						label="Contacts"
						onClick={handleNavClick}
						isCollapsed={isCollapsed}
					/>
				</div>

				{/* Custom folders */}
				{customFolders.length > 0 && (
					<div className="pt-5">
						<div className={`flex items-center justify-between mb-1.5 ${isCollapsed ? "px-0 md:px-0 lg:px-3 justify-center lg:justify-between" : "px-3"}`}>
							<span className={`text-xs uppercase tracking-wider font-bold text-slate-500 ${isCollapsed ? "hidden lg:block" : ""}`}>
								Folders
							</span>
							<Tooltip content="New folder" asChild>
								<Button
									variant="ghost"
									shape="square"
									size="sm"
									icon={<PlusIcon size={16} />}
									onClick={() => setIsCreateFolderOpen(true)}
									aria-label="Create new folder"
									className={isCollapsed ? "mx-auto lg:mx-0" : ""}
								/>
							</Tooltip>
						</div>
						<div className="space-y-0.5">
							{customFolders.map((folder) => (
								<FolderLink
									key={folder.id}
									to={`/mailbox/${mailboxId}/emails/${folder.id}`}
									icon={<FolderIcon size={18} weight="regular" />}
									label={folder.name}
									unreadCount={folder.unreadCount}
									onClick={handleNavClick}
									isCollapsed={isCollapsed}
								/>
							))}
						</div>
					</div>
				)}

				{/* Add folder button when no custom folders */}
				{customFolders.length === 0 && (
					<div className="pt-5">
						<div className={`flex items-center justify-between mb-1.5 ${isCollapsed ? "px-0 md:px-0 lg:px-3 justify-center lg:justify-between" : "px-3"}`}>
							<span className={`text-xs uppercase tracking-wider font-bold text-slate-500 ${isCollapsed ? "hidden lg:block" : ""}`}>
								Folders
							</span>
							<Tooltip content="New folder" asChild>
								<Button
									variant="ghost"
									shape="square"
									size="sm"
									icon={<PlusIcon size={16} />}
									onClick={() => setIsCreateFolderOpen(true)}
									aria-label="Create new folder"
									className={isCollapsed ? "mx-auto lg:mx-0" : ""}
								/>
							</Tooltip>
						</div>
					</div>
				)}
			</nav>

			{/* Create folder dialog */}
			{isCreateFolderOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
					<div 
						className="absolute inset-0 bg-black/30 transition-opacity" 
						onClick={() => setIsCreateFolderOpen(false)} 
					/>
					<div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm pointer-events-auto p-6 animate-in fade-in zoom-in-95 duration-200">
						<div className="text-base font-semibold mb-4 text-kumo-default">
							Create folder
						</div>
						<form onSubmit={handleCreateFolder} className="space-y-4">
							<Input
								label="Folder name"
								placeholder="e.g. Projects"
								value={newFolderName}
								onChange={(e) => setNewFolderName(e.target.value)}
								required
							/>
							<div className="flex justify-end gap-2">
								<Button type="button" variant="secondary" onClick={() => setIsCreateFolderOpen(false)}>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="primary"
									disabled={!newFolderName.trim()}
								>
									Create
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</aside>
	);
}
