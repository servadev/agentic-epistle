import { useState, useRef, useEffect } from "react";
import { useContacts } from "~/queries/contacts";
import type { Contact } from "~/types";
import { UserCircleIcon, XIcon } from "@phosphor-icons/react";

interface ContactSelectorProps {
	mailboxId: string | undefined;
	selectedContacts: string[]; // array of contact IDs
	onChange: (contacts: string[]) => void;
}

export function ContactSelector({ mailboxId, selectedContacts, onChange }: ContactSelectorProps) {
	const { data: contactsData } = useContacts(mailboxId);
	const allContacts: Contact[] = contactsData?.contacts || [];

	const [query, setQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const safeSelectedContacts = selectedContacts || [];

	const selectedContactObjects = safeSelectedContacts
		.map(id => allContacts.find(c => c.id === id))
		.filter((c): c is Contact => c !== undefined);

	const filteredContacts = allContacts.filter(c => {
		if (safeSelectedContacts.includes(c.id)) return false;
		const searchStr = `${c.name} ${c.email} ${c.org || ""}`.toLowerCase();
		return searchStr.includes(query.toLowerCase());
	});

	const handleSelect = (contact: Contact) => {
		onChange([...safeSelectedContacts, contact.id]);
		setQuery("");
		setIsOpen(false);
	};

	const handleRemove = (id: string) => {
		onChange(safeSelectedContacts.filter(cId => cId !== id));
	};

	return (
		<div className="space-y-2 w-full" ref={wrapperRef}>
			<label className="block text-sm font-medium text-kumo-default">Attendees</label>
			
			{selectedContactObjects.length > 0 && (
				<div className="flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto pr-1">
					{selectedContactObjects.map(contact => (
						<div key={contact.id} className="flex items-center gap-1.5 bg-kumo-tint rounded-full py-1 pl-1 pr-2 border border-kumo-line text-sm max-w-full">
							{contact.avatar_url ? (
								<img src={contact.avatar_url} alt="" className="w-5 h-5 rounded-full shrink-0" />
							) : (
								<UserCircleIcon className="w-5 h-5 text-kumo-subtle shrink-0" weight="fill" />
							)}
							<span className="font-medium text-kumo-strong truncate">{contact.name}</span>
							<button 
								type="button" 
								onClick={() => handleRemove(contact.id)}
								className="text-kumo-subtle hover:text-kumo-strong rounded-full p-0.5 shrink-0"
							>
								<XIcon size={12} weight="bold" />
							</button>
						</div>
					))}
				</div>
			)}

			<div className="relative">
				<input
					type="text"
					className="w-full rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm text-kumo-default focus:border-kumo-brand focus:outline-none focus:ring-1 focus:ring-kumo-brand"
					placeholder="Search contacts..."
					value={query}
					onChange={e => {
						setQuery(e.target.value);
						setIsOpen(true);
					}}
					onFocus={() => setIsOpen(true)}
				/>

				{isOpen && filteredContacts.length > 0 && (
					<div className="absolute z-[110] w-full mt-1 bg-white border border-kumo-line rounded-md shadow-lg max-h-60 overflow-y-auto">
						{filteredContacts.map(contact => (
							<button
								key={contact.id}
								type="button"
								className="w-full text-left px-3 py-2 hover:bg-kumo-tint flex items-center gap-2"
								onClick={() => handleSelect(contact)}
							>
								{contact.avatar_url ? (
									<img src={contact.avatar_url} alt="" className="w-6 h-6 rounded-full" />
								) : (
									<UserCircleIcon className="w-6 h-6 text-kumo-subtle" weight="fill" />
								)}
								<div className="flex flex-col overflow-hidden">
									<span className="text-sm font-medium text-kumo-default truncate">{contact.name}</span>
									<span className="text-xs text-kumo-subtle truncate">{contact.email}</span>
								</div>
							</button>
						))}
					</div>
				)}
				{isOpen && query && filteredContacts.length === 0 && (
					<div className="absolute z-[110] w-full mt-1 bg-white border border-kumo-line rounded-md shadow-lg p-3 text-sm text-kumo-subtle text-center">
						No contacts found
					</div>
				)}
			</div>
		</div>
	);
}
