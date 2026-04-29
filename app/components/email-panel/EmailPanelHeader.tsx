// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import type { ReactNode } from "react";
import { Button, Tooltip } from "@cloudflare/kumo";
import { ArrowLeftIcon, XIcon } from "@phosphor-icons/react";
import { formatDetailDate } from "~/lib/utils";
import type { Email } from "~/types";

interface EmailPanelHeaderProps {
	email: Email;
	avatarUrl?: string;
	contactName?: string;
	onClose: () => void;
	toolbar?: ReactNode;
}

export default function EmailPanelHeader({
	email,
	avatarUrl,
	contactName,
	onClose,
	toolbar,
}: EmailPanelHeaderProps) {
	const senderMatch = email.sender.match(/^([^<]+)/);
	const fallbackName =
		senderMatch && senderMatch[1].trim()
			? senderMatch[1].replace(/"/g, "").trim()
			: email.sender.replace(/<[^>]+>/, "").trim();
	
	// Ensure contactName is used if available and not just the raw email address
	const isRawEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fallbackName);
	const rawSenderEmail = email.sender.match(/<([^>]+)>/)?.[1] || email.sender.replace(/<[^>]+>/, "").trim();
	const displayName = contactName || (!isRawEmail && fallbackName && fallbackName !== email.sender ? fallbackName : fallbackName.split('@')[0]);
	const initial = displayName ? displayName.charAt(0).toUpperCase() : "U";

	const parsedTags = typeof email.tags === "string" ? JSON.parse(email.tags) : email.tags;
	const tagsArray = Array.isArray(parsedTags) ? parsedTags : [];

	return (
		<div className="flex flex-col border-b border-kumo-line shrink-0 bg-kumo-background">
			{toolbar && (
				<div className="border-b border-kumo-line/30 flex justify-between items-center pl-3">
					<div className="flex items-center">
						<Tooltip content="Close" side="bottom" asChild>
							<Button
								variant="ghost"
								shape="square"
								size="sm"
								icon={<XIcon size={18} />}
								onClick={onClose}
								aria-label="Close"
								className="hidden md:flex"
							/>
						</Tooltip>
						<Button
							variant="ghost"
							shape="square"
							size="sm"
							icon={<ArrowLeftIcon size={18} />}
							onClick={onClose}
							aria-label="Back to list"
							className="md:hidden flex shrink-0"
						/>
					</div>
					{toolbar}
				</div>
			)}
			<div className="px-4 py-3 md:px-6">
				<div className="flex items-start justify-between gap-4">
					{/* Left side */}
					<div className="flex items-center gap-3 min-w-0">
					{avatarUrl ? (
						<img
							src={avatarUrl}
							alt=""
							className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg object-cover bg-kumo-fill shadow-sm"
						/>
					) : (
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-kumo-fill text-kumo-subtle text-[15px] font-bold shadow-sm">
							{initial}
						</div>
					)}
					<div className="min-w-0 flex flex-col justify-center">
						<div className="text-[12px] text-kumo-subtle truncate flex items-center gap-1.5 mb-0.5">
							<span className="font-medium text-slate-700">{displayName}</span>
							<span className="text-slate-400">&lt;{rawSenderEmail}&gt;</span>
						</div>
						<div className="text-[22px] font-semibold text-kumo-default truncate leading-tight">
							{email.subject || "No Subject"}
						</div>
					</div>
				</div>

					{/* Right side */}
					<div className="flex flex-col items-end gap-1.5 shrink-0">
						<span className="text-[13px] text-kumo-subtle whitespace-nowrap">
							{formatDetailDate(email.date)}
						</span>
						{tagsArray.length > 0 && (
							<div className="hidden sm:flex items-center gap-1.5">
								{tagsArray.map((tag: any) => (
									<span
										key={tag.id}
										className="inline-flex items-center gap-1.5 rounded-md bg-kumo-background px-2 py-0.5 text-[10px] font-bold text-kumo-default ring-1 ring-inset ring-kumo-line shadow-sm uppercase tracking-wider"
									>
										<span
											className={`h-1.5 w-1.5 rounded-full ${tag.color}`}
										/>
										{tag.name}
									</span>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
