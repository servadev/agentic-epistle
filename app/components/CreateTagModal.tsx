import { Button, Input, useKumoToastManager } from "@cloudflare/kumo";
import { XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useMailbox, useUpdateMailbox } from "~/queries/mailboxes";
import type { Tag } from "~/types";

const COLORS = [
	"bg-red-500",
	"bg-orange-500",
	"bg-amber-500",
	"bg-green-500",
	"bg-emerald-500",
	"bg-teal-500",
	"bg-cyan-500",
	"bg-blue-500",
	"bg-indigo-500",
	"bg-violet-500",
	"bg-purple-500",
	"bg-fuchsia-500",
	"bg-pink-500",
	"bg-rose-500",
	"bg-slate-500",
];

export default function CreateTagModal({
	mailboxId,
	isOpen,
	onClose,
}: {
	mailboxId: string;
	isOpen: boolean;
	onClose: () => void;
}) {
	const { data: mailbox } = useMailbox(mailboxId);
	const updateMailbox = useUpdateMailbox();
	const toast = useKumoToastManager();

	const [newTagName, setNewTagName] = useState("");
	const [newTagColor, setNewTagColor] = useState(COLORS[0]);

	if (!isOpen || typeof document === "undefined") return null;

	const handleCreateTag = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTagName.trim()) {
			toast.add({ type: "error", title: "Tag name cannot be empty" });
			return;
		}

		const tags = mailbox?.settings?.tags || [];
		
		if (tags.some(t => t.name.toLowerCase() === newTagName.trim().toLowerCase())) {
			toast.add({ type: "error", title: "A tag with this name already exists" });
			return;
		}

		const newTag: Tag = {
			id: crypto.randomUUID(),
			name: newTagName.trim(),
			color: newTagColor,
		};

		updateMailbox.mutate(
			{
				mailboxId,
				settings: {
					...(mailbox?.settings || {}),
					tags: [...tags, newTag],
				},
			},
			{
				onSuccess: () => {
					toast.add({ title: "Tag created" });
					setNewTagName("");
					setNewTagColor(COLORS[0]);
					onClose();
				},
				onError: () => {
					toast.add({ type: "error", title: "Failed to create tag" });
				},
			},
		);
	};

	return createPortal(
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
			<div 
				className="absolute inset-0 bg-black/30 transition-opacity" 
				onClick={onClose} 
			/>
			<div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm pointer-events-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
				<div className="flex items-center justify-between px-4 py-3 border-b border-kumo-line">
					<div className="text-base font-semibold text-kumo-default">
						Create new tag
					</div>
					<Button
						variant="ghost"
						shape="square"
						size="sm"
						icon={<XIcon size={16} />}
						onClick={onClose}
						aria-label="Close"
					/>
				</div>

				<div className="p-4">
					<form onSubmit={handleCreateTag} className="space-y-4">
						<Input
							autoFocus
							label="Tag Name"
							value={newTagName}
							onChange={(e) => setNewTagName(e.target.value)}
							placeholder="e.g. Important, Follow Up"
						/>
						<div>
							<label className="block text-sm font-medium text-kumo-strong mb-2">
								Color
							</label>
							<div className="flex flex-wrap gap-2">
								{COLORS.map((color) => (
									<button
										key={color}
										type="button"
										onClick={() => setNewTagColor(color)}
										className={`w-6 h-6 rounded-full ${color} ${
											newTagColor === color
												? "ring-2 ring-offset-2 ring-kumo-brand"
												: "ring-1 ring-black/10"
										}`}
										aria-label={`Select color ${color}`}
									/>
								))}
							</div>
						</div>
						<div className="flex justify-end gap-2 mt-4 pt-4 border-t border-kumo-line">
							<Button type="button" variant="ghost" size="sm" onClick={onClose}>
								Cancel
							</Button>
							<Button type="submit" variant="primary" size="sm" disabled={!newTagName.trim()}>
								Create Tag
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>,
		document.body
	);
}