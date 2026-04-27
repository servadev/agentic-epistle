import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, Link } from "react-router";
import { Button, Input, useKumoToastManager } from "@cloudflare/kumo";
import {
  PlusIcon,
  XIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  BuildingsIcon,
  PhoneIcon,
  ArrowLeftIcon,
  CameraIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import {
  useContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
} from "~/queries/contacts";
import { useSearchEmails } from "~/queries/search";
import type { Contact } from "~/types";

function ContactMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        shape="square"
        icon={<DotsThreeIcon size={20} />}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="Contact options"
      />
      {open && (
        <div className="absolute top-full right-0 z-50 mt-1 w-32 rounded-lg border border-kumo-line bg-white shadow-lg py-1">
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-sm text-slate-900 hover:bg-slate-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function ContactsRoute() {
  const { mailboxId } = useParams<{ mailboxId: string }>();
  const toastManager = useKumoToastManager();

  const { data: contactsData, isLoading } = useContacts(mailboxId);
  const contacts = contactsData?.contacts || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Form state
  const [editForm, setEditForm] = useState<Partial<Contact>>({
    name: "",
    email: "",
    phone: "",
    org: "",
    notes: "",
  });

  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContact();
  const deleteContactMutation = useDeleteContact();

  const filteredContacts = useMemo(() => {
    let result = contacts;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          (c.org && c.org.toLowerCase().includes(query)),
      );
    }

    // Sort to put mailbox owner at the top
    return [...result].sort((a, b) => {
      if (a.email === mailboxId) return -1;
      if (b.email === mailboxId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [contacts, searchQuery, mailboxId]);

  // Fetch recent emails for selected contact
  const { data: recentEmailsData } = useSearchEmails(
    mailboxId,
    selectedContact ? selectedContact.email : "",
    1,
  );

  const recentEmails = recentEmailsData?.results?.slice(0, 5) || [];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!mailboxId || !selectedContact) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      toastManager.add({
        title: "File size exceeds 5MB limit",
        variant: "error",
      });
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toastManager.add({
        title: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.",
        variant: "error",
      });
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch(
        `/api/v1/mailboxes/${mailboxId}/contacts/${selectedContact.id}/avatar`,
        {
          method: "PUT",
          body: formData,
        },
      );
      const data = (await res.json()) as {
        error?: string;
        avatar_url?: string;
      };
      if (!res.ok) throw new Error(data.error || "Failed to upload avatar");

      // Update the edit form and selected contact locally so UI updates
      setEditForm((prev) => ({ ...prev, avatar_url: data.avatar_url || "" }));
      setSelectedContact((prev) =>
        prev ? { ...prev, avatar_url: data.avatar_url || "" } : null,
      );
      toastManager.add({ title: "Avatar uploaded successfully!" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload avatar.";
      toastManager.add({ title: message, variant: "error" });
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mailboxId) return;

    if (!editForm.name || !editForm.email) {
      toastManager.add({
        title: "Name and Email are required",
        variant: "error",
      });
      return;
    }

    try {
      if (selectedContact && isEditOpen) {
        await updateContactMutation.mutateAsync({
          mailboxId,
          id: selectedContact.id,
          contact: editForm,
        });
        toastManager.add({ title: "Contact updated successfully!" });
      } else {
        await createContactMutation.mutateAsync({
          mailboxId,
          contact: editForm,
        });
        toastManager.add({ title: "Contact created successfully!" });
      }
      setIsEditOpen(false);
      if (!selectedContact) {
        setEditForm({ name: "", email: "", phone: "", org: "", notes: "" });
      }
    } catch (err) {
      const message =
        (err instanceof Error ? err.message : null) ||
        "Failed to save contact.";
      toastManager.add({ title: message, variant: "error" });
    }
  };

  const handleDelete = async () => {
    if (!mailboxId || !selectedContact) return;
    try {
      await deleteContactMutation.mutateAsync({
        mailboxId,
        id: selectedContact.id,
      });
      setSelectedContact(null);
      setIsDeleteConfirmOpen(false);
      toastManager.add({ title: "Contact deleted successfully!" });
    } catch (err) {
      const message =
        (err instanceof Error ? err.message : null) ||
        "Failed to delete contact.";
      toastManager.add({ title: message, variant: "error" });
    }
  };

  const isPanelOpen = selectedContact !== null || isEditOpen;

  return (
    <div className="relative flex h-full bg-kumo-base overflow-hidden">
      {/* Left panel: List */}
      <div
        className={`flex flex-col min-w-0 shrink-0 w-full md:w-[380px] md:border-r md:border-kumo-line transition-transform duration-300 ease-in-out ${
          isPanelOpen ? "-translate-x-full md:translate-x-0" : "translate-x-0"
        }`}
      >
        <div className="p-4 border-b border-kumo-line flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-kumo-default">
              Contacts
            </h1>
            <Button
              variant="primary"
              size="sm"
              icon={<PlusIcon size={14} />}
              onClick={() => {
                setSelectedContact(null);
                setEditForm({
                  name: "",
                  email: "",
                  phone: "",
                  org: "",
                  notes: "",
                });
                setIsEditOpen(true);
              }}
            >
              New
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="text-kumo-subtle" />
            </div>
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-kumo-subtle text-sm">
              Loading...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-kumo-subtle text-sm">
              No contacts found.
            </div>
          ) : (
            <div className="divide-y divide-kumo-line">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className={`group relative w-full text-left p-3 hover:bg-kumo-tint transition-colors flex items-center gap-3 ${selectedContact?.id === contact.id ? "bg-kumo-tint" : ""}`}
                  onClick={() => {
                    setSelectedContact(contact);
                    setIsEditOpen(false);
                  }}
                >
                  <div className="shrink-0">
                    {contact.avatar_url ? (
                      <img
                        src={contact.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-kumo-fill"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center text-lg font-bold shadow-sm">
                        {contact.name
                          ? contact.name.charAt(0).toUpperCase()
                          : contact.email.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm text-kumo-default truncate">
                        {contact.name}
                      </div>
                      {contact.email === mailboxId && (
                        <span className="shrink-0 rounded bg-kumo-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-kumo-brand">
                          Me
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-kumo-subtle truncate">
                      {contact.email}
                    </div>
                  </div>
                  
                  <div className="hidden group-hover:flex group-focus-within:flex items-center shrink-0 absolute top-1/2 -translate-y-1/2 right-4 bg-white/90 backdrop-blur rounded-md shadow-sm border border-slate-200 z-10">
                    <button
                      type="button"
                      tabIndex={0}
                      className="p-1.5 text-slate-400 hover:text-slate-900 focus:text-slate-900 transition-colors border-r border-slate-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedContact(contact);
                        setEditForm({
                          name: contact.name,
                          email: contact.email,
                          phone: contact.phone,
                          org: contact.org,
                          notes: contact.notes,
                        });
                        setIsEditOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedContact(contact);
                          setEditForm({
                            name: contact.name,
                            email: contact.email,
                            phone: contact.phone,
                            org: contact.org,
                            notes: contact.notes,
                          });
                          setIsEditOpen(true);
                        }
                      }}
                      aria-label="Edit contact"
                    >
                      <PencilSimpleIcon size={16} />
                    </button>
                    <button
                      type="button"
                      tabIndex={0}
                      className="p-1.5 text-slate-400 hover:text-red-600 focus:text-red-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedContact(contact);
                        setIsDeleteConfirmOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedContact(contact);
                          setIsDeleteConfirmOpen(true);
                        }
                      }}
                      aria-label="Delete contact"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Details / Form */}
      <div
        className={`absolute inset-0 md:relative md:inset-auto md:flex-1 flex flex-col min-w-0 bg-kumo-recessed transition-transform duration-300 ease-in-out z-10 md:z-auto ${
          isPanelOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
      >
        {isEditOpen ? (
          <div className="max-w-2xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-kumo-default">
                {selectedContact ? "Edit Contact" : "New Contact"}
              </h2>
              <Button
                variant="ghost"
                icon={<XIcon />}
                onClick={() => setIsEditOpen(false)}
              />
            </div>
            <form
              onSubmit={handleSave}
              className="flex flex-col gap-4 bg-kumo-base p-4 md:p-6 rounded-xl border border-kumo-line shadow-sm"
            >
              {selectedContact && (
                <div className="flex justify-center mb-2">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => setIsAvatarModalOpen(true)}
                  >
                    {editForm.avatar_url ? (
                      <img
                        src={editForm.avatar_url}
                        alt="Avatar"
                        className="w-24 h-24 rounded-2xl object-cover bg-kumo-fill transition-opacity group-hover:opacity-75"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 text-3xl font-bold shadow-sm transition-opacity group-hover:opacity-75">
                        {editForm.name
                          ? editForm.name.charAt(0).toUpperCase()
                          : editForm.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl bg-black/30">
                      <CameraIcon
                        size={32}
                        weight="fill"
                        className="text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Name"
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
                <Input
                  label="Email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  value={editForm.phone || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
                <Input
                  label="Organization"
                  value={editForm.org || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, org: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-kumo-default mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm text-kumo-default focus:border-kumo-brand focus:outline-none focus:ring-1 focus:ring-kumo-brand resize-none"
                  rows={4}
                  value={editForm.notes || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  loading={
                    createContactMutation.isPending ||
                    updateContactMutation.isPending
                  }
                >
                  Save
                </Button>
              </div>
            </form>
          </div>
        ) : selectedContact ? (
          <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 md:p-8 overflow-y-auto">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
              <div className="flex items-center gap-3 md:gap-4">
                <Button
                  variant="ghost"
                  className="md:hidden -ml-2 text-kumo-subtle"
                  icon={<ArrowLeftIcon size={20} />}
                  onClick={() => setSelectedContact(null)}
                />
                {selectedContact.avatar_url ? (
                  <img
                    src={selectedContact.avatar_url}
                    alt=""
                    className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover bg-kumo-fill shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 text-2xl font-bold shadow-sm">
                    {selectedContact.name
                      ? selectedContact.name.charAt(0).toUpperCase()
                      : selectedContact.email.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <h2 className="text-xl md:text-2xl font-bold text-kumo-default">
                      {selectedContact.name}
                    </h2>
                    {selectedContact.email === mailboxId && (
                      <span className="rounded bg-kumo-brand/10 px-2 py-0.5 text-xs font-semibold text-kumo-brand">
                        Me
                      </span>
                    )}
                  </div>
                  <div className="text-sm md:text-base text-kumo-subtle">
                    {selectedContact.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end md:self-auto">
                <ContactMenu
                  onEdit={() => {
                    setEditForm({
                      name: selectedContact.name,
                      email: selectedContact.email,
                      phone: selectedContact.phone,
                      org: selectedContact.org,
                      notes: selectedContact.notes,
                    });
                    setIsEditOpen(true);
                  }}
                  onDelete={() => setIsDeleteConfirmOpen(true)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
              {selectedContact.org && (
                <div className="flex items-center gap-3 bg-kumo-base p-4 rounded-xl border border-kumo-line">
                  <div className="w-10 h-10 rounded-full bg-kumo-tint flex items-center justify-center text-kumo-subtle shrink-0">
                    <BuildingsIcon size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-kumo-strong uppercase">
                      Organization
                    </div>
                    <div className="text-sm text-kumo-default">
                      {selectedContact.org}
                    </div>
                  </div>
                </div>
              )}
              {selectedContact.phone && (
                <div className="flex items-center gap-3 bg-kumo-base p-4 rounded-xl border border-kumo-line">
                  <div className="w-10 h-10 rounded-full bg-kumo-tint flex items-center justify-center text-kumo-subtle shrink-0">
                    <PhoneIcon size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-kumo-strong uppercase">
                      Phone
                    </div>
                    <div className="text-sm text-kumo-default">
                      {selectedContact.phone}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedContact.notes && (
              <div className="bg-kumo-base p-5 rounded-xl border border-kumo-line mb-8">
                <div className="text-xs font-medium text-kumo-strong uppercase mb-2">
                  Notes
                </div>
                <div className="text-sm text-kumo-default whitespace-pre-wrap">
                  {selectedContact.notes}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-kumo-default mb-4">
                Recent Emails
              </h3>
              <div className="flex flex-col gap-2">
                {recentEmails.length > 0 ? (
                  recentEmails.map((email) => (
                    <Link
                      key={email.id}
                      to={`/mailbox/${mailboxId}/emails/inbox?selected=${email.id}`}
                      className="group flex flex-col gap-1 p-3 bg-kumo-base border border-kumo-line rounded-lg hover:border-kumo-brand transition-colors no-underline"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-kumo-default truncate">
                          {email.subject || "(No subject)"}
                        </span>
                        <span className="text-xs text-kumo-subtle shrink-0 ml-4">
                          {new Date(email.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-kumo-subtle truncate">
                        {email.sender === selectedContact.email
                          ? "From them"
                          : "To them"}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-sm text-kumo-subtle p-4 text-center bg-kumo-base border border-kumo-line rounded-lg">
                    No recent emails found.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center relative bg-gradient-to-br from-indigo-50 via-slate-50 to-cyan-50 w-full h-full overflow-hidden hidden md:flex">
            {/* Faded background watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <img
                src="/feather.svg"
                alt="Epistle Watermark"
                className="w-96 h-96 md:w-[500px] md:h-[500px] object-contain opacity-[0.03] grayscale"
              />
            </div>

            {/* Foreground content */}
            <div className="relative z-10 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
              <h2 className="text-4xl font-bold text-slate-300 tracking-tight">
                Epistle
              </h2>
              <p className="text-sm font-medium text-slate-400">
                Select a contact to view details
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Avatar Upload Modal */}
      {isAvatarModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-kumo-base rounded-lg shadow-lg w-full max-w-sm overflow-hidden flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-kumo-default">
                Update Avatar
              </h2>
              <Button
                variant="ghost"
                icon={<XIcon />}
                onClick={() => setIsAvatarModalOpen(false)}
              />
            </div>

            <div className="flex flex-col items-center gap-4 mb-6">
              {editForm.avatar_url ? (
                <img
                  src={editForm.avatar_url}
                  alt="Avatar Preview"
                  className="w-32 h-32 rounded-2xl object-cover bg-kumo-fill"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-600 text-4xl font-bold shadow-sm">
                  {editForm.name
                    ? editForm.name.charAt(0).toUpperCase()
                    : editForm.email?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="w-full">
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/gif, image/webp"
                  onChange={async (e) => {
                    await handleAvatarUpload(e);
                    setIsAvatarModalOpen(false);
                  }}
                  className="block w-full text-sm text-kumo-subtle
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-kumo-tint file:text-kumo-default
                    hover:file:bg-kumo-overlay
                    cursor-pointer"
                />
                <div className="text-xs text-kumo-subtle mt-2 text-center">
                  Max size: 5MB. JPEG, PNG, GIF, WebP.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-kumo-base rounded-lg shadow-lg w-full max-w-sm overflow-hidden flex flex-col p-6">
            <h2 className="text-lg font-semibold text-kumo-default mb-2">
              Delete Contact
            </h2>
            <p className="text-kumo-subtle text-sm mb-6">
              Are you sure you want to delete "{selectedContact.name}"? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                loading={deleteContactMutation.isPending}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
