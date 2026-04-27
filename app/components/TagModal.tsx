import { Button, Dialog, Input, useKumoToastManager } from "@cloudflare/kumo";
import { CheckIcon, PlusIcon, TagIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useUpdateEmail } from "~/queries/emails";
import { useMailbox, useUpdateMailbox } from "~/queries/mailboxes";
import type { Email, Tag } from "~/types";

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

export default function TagModal({
	email,
	mailboxId,
	isOpen,
	onClose,
}: {
	email: Email | null;
	mailboxId: string;
	isOpen: boolean;
	onClose: () => void;
}) {
	const { data: mailbox } = useMailbox(mailboxId);
	const updateMailbox = useUpdateMailbox();
	const updateEmail = useUpdateEmail();
	const toast = useKumoToastManager();

	const [isCreating, setIsCreating] = useState(false);
	const [newTagName, setNewTagName] = useState("");
	const [newTagColor, setNewTagColor] = useState(COLORS[0]);

	if (!email || !mailboxId) return null;

	const tags = mailbox?.settings?.tags || [];
	const emailTags = email.tags || [];

	const handleToggleTag = (tag: Tag) => {
		const hasTag = emailTags.some((t) => t.id === tag.id);
		const newTags = hasTag
			? emailTags.filter((t) => t.id !== tag.id)
			: [...emailTags, tag];

		updateEmail.mutate({
			mailboxId,
			id: email.id,
			data: { tags: newTags },
		});
	};

	const handleCreateTag = () => {
		if (!newTagName.trim()) {
			toast.add({ type: "error", title: "Tag name cannot be empty" });
			return;
		}

		const newTag: Tag = {
			id: crypto.randomUUID(),
			name: newTagName.trim(),
			color: newTagColor,
		};

		const updatedTags = [...tags, newTag];

		updateMailbox.mutate(
			{
				mailboxId,
				settings: {
					...(mailbox?.settings || {}),
					tags: updatedTags,
				},
			},
			{
				onSuccess: () => {
					// Also automatically add this new tag to the current email
					handleToggleTag(newTag);
					setIsCreating(false);
					setNewTagName("");
					setNewTagColor(COLORS[0]);
				},
				onError: () => {
					toast.add({ type: "error", title: "Failed to create tag" });
				},
			},
		);
	};

	const handleDeleteTag = (e: React.MouseEvent, tagId: string) => {
		e.stopPropagation();
		if (!confirm("Are you sure you want to delete this tag? It will be removed from all emails.")) {
			return;
		}
		
		const updatedTags = tags.filter(t => t.id !== tagId);
		updateMailbox.mutate({
			mailboxId,
			settings: {
				...(mailbox?.settings || {}),
				tags: updatedTags,
			},
		});
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
			<div 
				className="absolute inset-0 bg-black/30 transition-opacity" 
				onClick={onClose} 
			/>
			<div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm pointer-events-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
				<div className="flex items-center justify-between px-4 py-3 border-b border-kumo-line">
					<div className="text-base font-semibold flex items-center gap-2">
						<TagIcon size={18} className="text-kumo-subtle" />
						Tags
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

				<div className="p-4 max-h-[60vh] overflow-y-auto">
					{isCreating ? (
						<div className="space-y-4">
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
								<Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
									Cancel
								</Button>
								<Button variant="primary" size="sm" onClick={handleCreateTag}>
									Create Tag
								</Button>
							</div>
						</div>
					) : (
						<div className="space-y-3">
							{tags.length === 0 ? (
								<div className="text-center py-6 text-kumo-subtle text-sm">
									No tags created yet.
								</div>
							) : (
								<div className="space-y-1">
									{tags.map((tag) => {
										const isSelected = emailTags.some((t) => t.id === tag.id);
										return (
											<button
												key={tag.id}
												type="button"
												className="w-full flex items-center justify-between p-2 rounded-md hover:bg-kumo-base/50 transition-colors group"
												onClick={() => handleToggleTag(tag)}
											>
												<div className="flex items-center gap-3">
													<div className={`w-3 h-3 rounded-full ${tag.color}`} />
													<span className="text-sm text-kumo-default font-medium">
														{tag.name}
													</span>
												</div>
												<div className="flex items-center gap-2">
													{isSelected && (
														<CheckIcon size={16} className="text-kumo-brand" />
													)}
													<div 
														className="opacity-0 group-hover:opacity-100 hover:bg-kumo-line/50 p-1 rounded transition-all"
														onClick={(e) => handleDeleteTag(e, tag.id)}
														role="button"
														tabIndex={0}
													>
														<XIcon size={14} className="text-kumo-subtle" />
													</div>
												</div>
											</button>
										);
									})}
								</div>
							)}

							<Button
								variant="ghost"
								size="sm"
								className="w-full justify-start mt-2"
								icon={<PlusIcon size={16} />}
								onClick={() => setIsCreating(true)}
							>
								Create new tag
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
