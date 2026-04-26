// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { useEffect, useRef } from "react";
import { Outlet, useParams, useLocation, useSearchParams } from "react-router";
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
	const [searchParams, setSearchParams] = useSearchParams();
	const currentFilter = searchParams.get("filter");
	const currentTag = searchParams.get("tag");

	const handleFilterClick = (filterType: "all" | "unread" | "tag", tagValue?: string) => {
		const newParams = new URLSearchParams(searchParams);
		if (filterType === "all") {
			newParams.delete("filter");
			newParams.delete("tag");
		} else if (filterType === "unread") {
			newParams.set("filter", "unread");
			newParams.delete("tag");
		} else if (filterType === "tag" && tagValue) {
			newParams.delete("filter");
			newParams.set("tag", tagValue);
		}
		// Reset to page 1 when filtering
		newParams.set("page", "1");
		setSearchParams(newParams);
	};

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
						<button 
							type="button" 
							onClick={() => handleFilterClick("all")}
							className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors ${!currentFilter && !currentTag ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
						>
							All messages ({allMessagesCount})
						</button>
						<button 
							type="button" 
							onClick={() => handleFilterClick("unread")}
							className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors ${currentFilter === "unread" ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
						>
							Unread ({unreadCount})
						</button>
						{tags.map((tag) => (
							<button
								key={tag.id}
								type="button"
								onClick={() => handleFilterClick("tag", tag.id)}
								className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors ${currentTag === tag.id ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
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
