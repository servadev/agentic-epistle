// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Button, Tooltip } from "@cloudflare/kumo";
import { XIcon } from "@phosphor-icons/react";
import { formatDetailDate } from "~/lib/utils";
import type { Email } from "~/types";

interface EmailPanelHeaderProps {
	email: Email;
	avatarUrl?: string;
	onClose: () => void;
}

export default function EmailPanelHeader({
	email,
	avatarUrl,
	onClose,
}: EmailPanelHeaderProps) {
	const senderMatch = email.sender.match(/^([^<]+)/);
	const senderName =
		senderMatch && senderMatch[1].trim()
			? senderMatch[1].replace(/"/g, "").trim()
			: email.sender.replace(/<[^>]+>/, "").trim();
	const initial = senderName ? senderName.charAt(0).toUpperCase() : "U";

	return (
		<div className="px-4 py-3 border-b border-kumo-line shrink-0 md:px-6 bg-kumo-background">
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
						<div className="text-[15px] font-medium text-kumo-default truncate">
							{senderName}
						</div>
						<div className="text-[13px] text-kumo-subtle truncate mt-0.5">
							{email.subject}
						</div>
					</div>
				</div>

				{/* Right side */}
				<div className="flex items-center gap-3 shrink-0">
					{Array.isArray(email.tags) && email.tags.length > 0 && (
						<div className="hidden sm:flex items-center gap-1.5">
							{email.tags.map((tag) => (
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
					<span className="text-[13px] text-kumo-subtle">
						{formatDetailDate(email.date)}
					</span>
					<Tooltip content="Close" side="bottom" asChild>
						<Button
							variant="ghost"
							shape="square"
							size="sm"
							icon={<XIcon size={18} />}
							onClick={onClose}
							aria-label="Close"
						/>
					</Tooltip>
				</div>
			</div>
		</div>
	);
}
