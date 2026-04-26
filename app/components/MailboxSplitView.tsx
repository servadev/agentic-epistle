// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import type { ReactNode } from "react";
import ComposePanel from "~/components/ComposePanel";
import EmailPanel from "~/components/EmailPanel";

interface MailboxSplitViewProps {
	selectedEmailId: string | null;
	isComposing: boolean;
	children: ReactNode;
}

export default function MailboxSplitView({
	selectedEmailId,
	isComposing,
	children,
}: MailboxSplitViewProps) {
	const isPanelOpen = selectedEmailId !== null || isComposing;

	return (
		<div className="relative flex h-full overflow-hidden">
			<div
				className={`flex flex-col min-w-0 shrink-0 w-full md:w-[380px] md:border-r md:border-slate-200 transition-transform duration-300 ease-in-out ${
					isPanelOpen
						? "-translate-x-full md:translate-x-0"
						: "translate-x-0"
				}`}
			>
				{children}
			</div>
			
			<div
				className={`absolute inset-0 md:relative md:inset-auto md:flex-1 flex flex-col min-w-0 bg-white transition-transform duration-300 ease-in-out z-10 md:z-auto ${
					isPanelOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
				}`}
			>
				<div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full h-full">
					{isComposing && !selectedEmailId ? (
						<ComposePanel />
					) : isComposing && selectedEmailId ? (
						<div className="flex flex-col h-full overflow-y-auto">
							<ComposePanel />
							<div className="border-t border-slate-200">
								<EmailPanel emailId={selectedEmailId} />
							</div>
						</div>
					) : selectedEmailId ? (
						<EmailPanel emailId={selectedEmailId} />
					) : (
						<div className="flex-1 flex flex-col items-center justify-center relative bg-gradient-to-br from-indigo-50 via-slate-50 to-cyan-50 w-full h-full overflow-hidden hidden md:flex">
							{/* Faded background watermark */}
							<div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
								<span className="text-[12rem] font-bold text-slate-200/50 tracking-tighter">
									Epistle
								</span>
							</div>
							
							{/* Foreground content */}
							<div className="relative z-10 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
								<h2 className="text-4xl font-bold text-slate-300 tracking-tight">
									Epistle
								</h2>
								<p className="text-sm font-medium text-slate-400">
									Select a message to get started
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
