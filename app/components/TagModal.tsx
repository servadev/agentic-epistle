import { Button, useKumoToastManager } from "@cloudflare/kumo";
import { CheckIcon, TagIcon, XIcon } from "@phosphor-icons/react";
import { createPortal } from "react-dom";
import { useUpdateEmail } from "~/queries/emails";
import { useMailbox } from "~/queries/mailboxes";
import type { Email, Tag } from "~/types";

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
	const updateEmail = useUpdateEmail();

	if (!email || !mailboxId || !isOpen || typeof document === "undefined") return null;

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

	return createPortal(
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
					<div className="space-y-3">
						{tags.length === 0 ? (
							<div className="text-center py-6 text-kumo-subtle text-sm">
								No tags available. Create tags in the sidebar.
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
											{isSelected && (
												<CheckIcon size={16} className="text-kumo-brand" />
											)}
										</button>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>,
		document.body
	);
}
