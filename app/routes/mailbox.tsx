// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { useEffect, useRef } from "react";
import { Outlet, useParams, useLocation } from "react-router";
import AgentSidebar from "~/components/AgentSidebar";
import ComposeEmail from "~/components/ComposeEmail";
import Header from "~/components/Header";
import Sidebar from "~/components/Sidebar";
import { useMailbox } from "~/queries/mailboxes";
import { useEmails } from "~/queries/emails";
import { useFolders } from "~/queries/folders";
import { Folders } from "shared/folders";
import { useUIStore } from "~/hooks/useUIStore";
import { safeSetStorage } from "~/lib/utils";

export default function MailboxRoute() {
	const { mailboxId } = useParams<{ mailboxId: string }>();
	const location = useLocation();
	// Prefetch mailbox data for child components
	const { data: mailbox } = useMailbox(mailboxId);
	
	// Fetch data for pills
	const { data: inboxData } = useEmails(mailboxId, { folder: Folders.INBOX });
	const { data: folders } = useFolders(mailboxId);
	const allMessagesCount = inboxData?.totalCount || 0;
	const unreadCount = folders?.find(f => f.id === Folders.INBOX)?.unreadCount || 0;
	
	const tags = mailbox?.settings?.tags || [];
	const prevMailboxIdRef = useRef<string | undefined>(undefined);
	const {
		isSidebarOpen,
		closeSidebar,
		isAgentPanelOpen,
		closePanel,
		closeComposeModal,
	} = useUIStore();

	useEffect(() => {
		if (mailboxId) {
			safeSetStorage("last_mailbox", mailboxId);
		}
		
		if (
			prevMailboxIdRef.current &&
			mailboxId &&
			prevMailboxIdRef.current !== mailboxId
		) {
			closePanel();
			closeComposeModal();
			closeSidebar();
		}

		prevMailboxIdRef.current = mailboxId;
	}, [mailboxId, closeComposeModal, closePanel, closeSidebar]);

	return (
		<div className="flex h-screen overflow-hidden">
			{/* Mobile/Tablet sidebar overlay backdrop */}
			{isSidebarOpen && (
				<div
					className="fixed inset-0 z-30 bg-black/30 lg:hidden"
					onClick={closeSidebar}
					onKeyDown={(e) => e.key === "Escape" && closeSidebar()}
					role="button"
					tabIndex={-1}
					aria-label="Close sidebar"
				/>
			)}

			{/* Sidebar: hidden on mobile by default, shown as overlay when open. On tablet, icon-only by default (handled in Sidebar) */}
			<div
				className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 md:z-0 ${
					isSidebarOpen ? "translate-x-0 md:fixed lg:relative lg:z-0" : "-translate-x-full"
				}`}
			>
				<Sidebar />
			</div>

			{/* Main content */}
			<div className="flex-1 flex flex-col min-w-0 bg-kumo-base">
				<Header />
				{location.pathname.endsWith("/inbox") && (
					<div className="w-full border-b border-slate-200 bg-white px-4 py-2 flex items-center gap-2 overflow-x-auto hide-scrollbar">
						<button type="button" className="shrink-0 flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 whitespace-nowrap hover:bg-indigo-100 transition-colors">
							All messages ({allMessagesCount})
						</button>
						<button type="button" className="shrink-0 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 whitespace-nowrap hover:bg-slate-50 transition-colors">
							Unread ({unreadCount})
						</button>
						{tags.map((tag) => (
							<button
								key={tag.id}
								type="button"
								className="shrink-0 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 whitespace-nowrap hover:bg-slate-50 transition-colors"
							>
								<span className={`h-2 w-2 rounded-full ${tag.color}`} />
								{tag.name}
							</button>
						))}
					</div>
				)}
				<main className="flex-1 overflow-hidden">
					<Outlet />
				</main>
			</div>

			{/* Agent + MCP sidebar -- togglable on desktop */}
			{isAgentPanelOpen && (
				<div className="hidden lg:flex w-[380px] shrink-0 border-l border-kumo-line flex-col bg-kumo-base overflow-hidden">
					<AgentSidebar />
				</div>
			)}

			<ComposeEmail />
		</div>
	);
}
