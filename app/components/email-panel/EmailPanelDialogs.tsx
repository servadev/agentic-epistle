// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Button, Dialog } from "@cloudflare/kumo";
import { downloadFile } from "~/lib/utils";
import type { Email } from "~/types";

interface PreviewImage {
	url: string;
	filename: string;
}

interface EmailPanelDialogsProps {
	sourceViewEmail: Email | null;
	previewImage: PreviewImage | null;
	onCloseSource: () => void;
	onClosePreview: () => void;
	isDeleteConfirmOpen: boolean;
	onCloseDeleteConfirm: () => void;
	onConfirmDelete: () => void;
	isDeleting: boolean;
	isTrashFolder: boolean;
}

function getSourceHeaders(msg: Email): { key: string; value: string }[] {
	if (msg.raw_headers) {
		try {
			const parsed = JSON.parse(msg.raw_headers);
			if (Array.isArray(parsed)) {
				return parsed.map((header) => ({
					key: header.key || header.name || "",
					value: String(header.value || ""),
				}));
			}
			if (typeof parsed === "object" && parsed !== null) {
				return Object.entries(parsed).map(([key, value]) => ({
					key,
					value: String(value),
				}));
			}
		} catch {
			// Fall through to field-based headers.
		}
	}

	const headers: { key: string; value: string }[] = [];
	if (msg.sender) headers.push({ key: "From", value: msg.sender });
	if (msg.recipient) headers.push({ key: "To", value: msg.recipient });
	if (msg.cc) headers.push({ key: "Cc", value: msg.cc });
	if (msg.bcc) headers.push({ key: "Bcc", value: msg.bcc });
	if (msg.subject) headers.push({ key: "Subject", value: msg.subject });
	if (msg.date) headers.push({ key: "Date", value: msg.date });
	if (msg.message_id) headers.push({ key: "Message-ID", value: msg.message_id });
	if (msg.in_reply_to) headers.push({ key: "In-Reply-To", value: msg.in_reply_to });
	if (msg.email_references) {
		headers.push({ key: "References", value: msg.email_references });
	}
	if (msg.thread_id) headers.push({ key: "X-Thread-ID", value: msg.thread_id });
	return headers;
}

export default function EmailPanelDialogs({
	sourceViewEmail,
	previewImage,
	onCloseSource,
	onClosePreview,
	isDeleteConfirmOpen,
	onCloseDeleteConfirm,
	onConfirmDelete,
	isDeleting,
	isTrashFolder,
}: EmailPanelDialogsProps) {
	const sourceHeaders = sourceViewEmail ? getSourceHeaders(sourceViewEmail) : [];

	return (
		<>
			{sourceViewEmail !== null && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
					<div 
						className="absolute inset-0 bg-black/30 transition-opacity" 
						onClick={onCloseSource} 
					/>
					<div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl pointer-events-auto p-6 animate-in fade-in zoom-in-95 duration-200">
						<h2 className="text-xl font-semibold mb-4 text-kumo-default flex items-center">
							Email Source Headers
							{sourceViewEmail && (
								<span className="text-sm font-normal text-kumo-subtle ml-2 truncate">
									{sourceViewEmail.subject}
								</span>
							)}
						</h2>
						{sourceViewEmail && (
							<div className="mt-4 max-h-[60vh] overflow-y-auto">
								<table className="w-full text-sm border-collapse">
									<tbody>
										{sourceHeaders.map((header, idx) => (
											<tr
												key={`${header.key}-${idx}`}
												className={idx % 2 === 0 ? "bg-kumo-tint/50" : ""}
											>
												<td className="py-1.5 px-3 font-mono font-semibold text-kumo-default whitespace-nowrap align-top w-[160px]">
													{header.key}
												</td>
												<td className="py-1.5 px-3 font-mono text-kumo-subtle break-all">
													{header.value}
												</td>
											</tr>
										))}
									</tbody>
								</table>
								{sourceHeaders.length === 0 && (
									<p className="text-sm text-kumo-subtle text-center py-8">
										No header data available for this email.
									</p>
								)}
							</div>
						)}
						<div className="flex justify-end mt-4">
							<Button variant="secondary" size="sm" onClick={onCloseSource}>
								Close
							</Button>
						</div>
					</div>
				</div>
			)}

			{previewImage !== null && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
					<div 
						className="absolute inset-0 bg-black/30 transition-opacity" 
						onClick={onClosePreview} 
					/>
					<div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl pointer-events-auto p-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
						<h2 className="text-xl font-semibold mb-4 text-kumo-default truncate">
							{previewImage?.filename}
						</h2>
						{previewImage && (
							<div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-kumo-tint/30 rounded-lg p-4">
								<img
									src={previewImage.url}
									alt={previewImage.filename}
									className="max-w-full max-h-[70vh] object-contain rounded shadow-sm"
								/>
							</div>
						)}
						<div className="flex justify-between items-center mt-4">
							<Button
								variant="secondary"
								size="sm"
								onClick={() => {
									if (previewImage) {
										downloadFile(previewImage.url, previewImage.filename);
									}
								}}
							>
								Download Original
							</Button>
							<Button variant="primary" size="sm" onClick={onClosePreview}>
								Close
							</Button>
						</div>
					</div>
				</div>
			)}

			{isDeleteConfirmOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
					<div 
						className="absolute inset-0 bg-black/30 transition-opacity" 
						onClick={onCloseDeleteConfirm} 
					/>
					<div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm pointer-events-auto p-6 animate-in fade-in zoom-in-95 duration-200">
						<h2 className="text-base font-semibold mb-2 text-kumo-default">
							{isTrashFolder ? "Delete Email Permanently" : "Move to Trash"}
						</h2>
						<p className="text-kumo-subtle text-sm mb-5">
							{isTrashFolder
								? "Are you sure you want to permanently delete this email? This action cannot be undone."
								: "Are you sure you want to move this email to the trash?"}
						</p>
						<div className="flex justify-end gap-2">
							<Button variant="secondary" size="sm" onClick={onCloseDeleteConfirm}>
								Cancel
							</Button>
							<Button
								variant="destructive"
								size="sm"
								loading={isDeleting}
								onClick={onConfirmDelete}
							>
								{isTrashFolder ? "Delete" : "Move to Trash"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
