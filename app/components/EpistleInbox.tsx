import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router";
import { 
  PencilSimpleIcon as Pen, 
  TrayIcon as Inbox, 
  StarIcon as Star, 
  ClockIcon as Clock, 
  FileIcon as FileText, 
  PaperPlaneTiltIcon as Send, 
  CaretDownIcon as ChevronDown, 
  CaretLeftIcon as ChevronLeft, 
  CaretRightIcon as ChevronRight, 
  ListIcon as Menu, 
  ArchiveIcon as Archive, 
  TrashIcon as Trash, 
  BookmarkSimpleIcon as BookmarkSimple, 
  TagIcon as Tag, 
  DotsThreeIcon as DotsThree, 
  ArrowLeftIcon as ArrowLeft, 
  PlusIcon as Plus, 
  SmileyIcon as Smiley, 
  TextAaIcon as TextAa, 
  PaperPlaneRightIcon as PaperPlaneRight
} from "@phosphor-icons/react";

import { useFolders } from "~/queries/folders";
import { useEmails, useThreadReplies, useMarkThreadRead } from "~/queries/emails";
import { useContacts } from "~/queries/contacts";
import { useMailboxes } from "~/queries/mailboxes";
import { Folders, SYSTEM_FOLDER_IDS, getFolderDisplayName } from "shared/folders";
import { formatListDate, formatShortDate } from "shared/dates";
import { getSnippetText } from "~/lib/utils";

// --- Helper Functions ---
function getFolderIcon(folderId: string) {
  switch (folderId) {
    case Folders.INBOX: return Inbox;
    case Folders.SENT: return Send;
    case Folders.DRAFT: return FileText;
    case Folders.ARCHIVE: return Archive;
    case Folders.TRASH: return Trash;
    default: return Tag; // Fallback
  }
}

const CATEGORY_COLORS = ["bg-blue-400", "bg-green-400", "bg-purple-400", "bg-orange-400", "bg-pink-400", "bg-teal-400"];

export default function EpistleInbox() {
  const { mailboxId: routeMailboxId } = useParams<{ mailboxId: string }>();
  const { data: mailboxes = [] } = useMailboxes();
  const mailboxId = routeMailboxId || mailboxes[0]?.id;

  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>(Folders.INBOX);

  // Data Queries
  const { data: folders = [] } = useFolders(mailboxId);
  const { data: contactsData } = useContacts(mailboxId);
  const { data: emailData } = useEmails(mailboxId, { folder: selectedFolder, limit: "50" });
  
  const emails = emailData?.emails ?? [];
  const contacts = contactsData?.contacts ?? [];
  
  const activeEmail = emails.find(e => e.id === activeMessageId || e.thread_id === activeMessageId);
  const activeThreadId = activeEmail?.thread_id || activeEmail?.id || activeMessageId;
  
  const { data: threadEmails = [] } = useThreadReplies(mailboxId, activeThreadId);
  const markThreadRead = useMarkThreadRead();

  useEffect(() => {
    if (activeThreadId && mailboxId) {
      // Mark as read when opened
      markThreadRead.mutate({ mailboxId, threadId: activeThreadId });
    }
  }, [activeThreadId, mailboxId]);

  // Derived state
  const isThreadOpenOnMobile = activeMessageId !== null;
  const isSidebarCollapsed = desktopCollapsed;

  // Split folders
  const systemFolders = folders.filter(f => SYSTEM_FOLDER_IDS.includes(f.id as any));
  const customFolders = folders.filter(f => !SYSTEM_FOLDER_IDS.includes(f.id as any) && f.id !== Folders.SPAM);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: Record<string, typeof emails> = {};
    for (const msg of emails) {
      let groupName = "Older";
      if (msg.date) {
        const d = new Date(msg.date);
        if (!isNaN(d.getTime())) {
          const today = new Date();
          if (d.toDateString() === today.toDateString()) {
            groupName = "Today";
          } else if (d.getFullYear() === today.getFullYear()) {
            groupName = d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
          } else {
            groupName = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
          }
        }
      }
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(msg);
    }
    return groups;
  }, [emails]);

  const activeFolderName = getFolderDisplayName(selectedFolder);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-gray-800 font-sans">
      
      {/* Mobile/Tablet Sidebar Overlay Background */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* --- COLUMN 1: SIDEBAR --- */}
      {/* Desktop static space, Tablet icon-only space */}
      <div className={`hidden sm:block lg:block shrink-0 transition-all duration-300 ease-in-out ${desktopCollapsed ? "w-[72px]" : "w-[72px] lg:w-[240px]"}`} />

      {/* Actual Sidebar Content */}
      <div 
        className={`
          fixed top-0 left-0 bottom-0 z-50 bg-slate-50 border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out
          ${desktopCollapsed ? "w-[72px]" : "w-[240px]"}
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}
          sm:w-[72px] lg:w-[240px]
          ${mobileSidebarOpen ? "!w-[240px]" : ""}
          ${desktopCollapsed ? "lg:!w-[72px]" : ""}
        `}
      >
        <div className="p-4 flex-shrink-0">
          <button className={`
            bg-slate-700 hover:bg-slate-800 text-white rounded-lg flex items-center justify-center transition-colors
            ${(desktopCollapsed || (!mobileSidebarOpen && typeof window !== 'undefined' && window.innerWidth >= 640 && window.innerWidth < 1024)) ? "lg:w-full sm:w-10 sm:h-10 sm:p-0" : "w-full py-2.5 px-4"}
            ${(desktopCollapsed || (!mobileSidebarOpen)) ? "max-sm:w-full max-sm:py-2.5 max-sm:px-4" : ""}
          `}>
            <Pen size={20} className={(!desktopCollapsed && mobileSidebarOpen) || (!desktopCollapsed && !mobileSidebarOpen) ? "sm:hidden lg:block lg:mr-2" : ""} />
            <span className={`font-medium ${(!desktopCollapsed && mobileSidebarOpen) || (!desktopCollapsed && !mobileSidebarOpen) ? "sm:hidden lg:block" : "hidden"}`}>Compose</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 custom-scrollbar">
          {/* Main Nav */}
          <nav className="space-y-1 px-3">
            {systemFolders.map((folder) => {
              const Icon = getFolderIcon(folder.id);
              const isSelected = selectedFolder === folder.id;
              return (
                <button 
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`
                    w-full flex items-center rounded-md py-2 px-3 transition-colors
                    ${isSelected ? "bg-gray-200 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-100"}
                    ${isSidebarCollapsed ? "justify-center" : "justify-between"}
                  `}
                  title={isSidebarCollapsed ? folder.name : undefined}
                >
                  <div className="flex items-center">
                    <Icon size={20} weight={isSelected ? "fill" : "regular"} />
                    {!isSidebarCollapsed && <span className="ml-3">{folder.name}</span>}
                  </div>
                  {!isSidebarCollapsed && folder.unreadCount > 0 && (
                    <span className="text-xs font-semibold text-gray-500">{folder.unreadCount}</span>
                  )}
                </button>
              );
            })}
            
            {!isSidebarCollapsed && (
              <button className="w-full flex items-center text-gray-600 hover:bg-gray-100 rounded-md py-2 px-3 mt-1 transition-colors">
                <ChevronDown size={16} />
                <span className="ml-3 text-sm">More</span>
              </button>
            )}
          </nav>

          {/* Categories */}
          {customFolders.length > 0 && (
            <div className="mt-8 px-3">
              {!isSidebarCollapsed && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                  Categories
                </h3>
              )}
              <div className="space-y-1">
                {customFolders.map((cat, index) => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedFolder(cat.id)}
                    className={`
                      w-full flex items-center rounded-md py-1.5 px-3 hover:bg-gray-100 transition-colors text-gray-600
                      ${selectedFolder === cat.id ? "bg-gray-100 text-gray-900 font-medium" : ""}
                      ${isSidebarCollapsed ? "justify-center" : "justify-between"}
                    `}
                    title={isSidebarCollapsed ? cat.name : undefined}
                  >
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-sm ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}`} />
                      {!isSidebarCollapsed && <span className="ml-3 text-sm truncate max-w-[120px] text-left">{cat.name}</span>}
                    </div>
                    {!isSidebarCollapsed && cat.unreadCount > 0 && (
                      <span className="text-xs text-gray-400">{cat.unreadCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contacts */}
          {contacts.length > 0 && (
            <div className="mt-8 px-3 mb-6">
              {!isSidebarCollapsed && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                  Contacts
                </h3>
              )}
              <div className="space-y-1">
                {contacts.slice(0, 10).map((contact) => (
                  <button 
                    key={contact.id}
                    className={`
                      w-full flex items-center rounded-md py-1.5 px-3 hover:bg-gray-100 transition-colors
                      ${isSidebarCollapsed ? "justify-center" : "justify-start"}
                    `}
                    title={isSidebarCollapsed ? contact.name : undefined}
                  >
                    <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {contact.avatar_url ? (
                        <img src={contact.avatar_url} alt={contact.name} className="w-full h-full rounded" />
                      ) : (
                        contact.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {!isSidebarCollapsed && <span className="ml-3 text-sm text-gray-600 truncate">{contact.name}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Toggle Sidebar Button */}
        <div className="p-3 border-t border-gray-200 hidden lg:flex justify-end">
          <button 
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors"
          >
            {desktopCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* --- COLUMN 2: MESSAGE LIST --- */}
      <div 
        className={`
          flex-shrink-0 border-r border-gray-200 flex flex-col bg-white transition-transform duration-300 ease-in-out
          w-full lg:w-[360px]
          ${isThreadOpenOnMobile ? "-translate-x-full lg:translate-x-0 absolute lg:relative h-full z-10" : "translate-x-0 relative z-10"}
        `}
      >
        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b border-gray-200 flex items-center">
          <button 
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md mr-2"
          >
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-lg">{activeFolderName}</h1>
        </div>

        {/* Filter Tabs */}
        <div className="p-4 border-b border-gray-100 overflow-x-auto no-scrollbar whitespace-nowrap">
          <div className="flex space-x-2">
            <button className="px-3 py-1.5 bg-slate-700 text-white text-sm rounded-full font-medium shadow-sm">
              All messages ({emailData?.totalCount || 0})
            </button>
            <button className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm rounded-full font-medium transition-colors">
              Unread
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {emails.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No messages in {activeFolderName.toLowerCase()}
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date} className="mb-4">
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-4 py-2 text-xs font-semibold text-gray-500">
                  {date}
                </div>
                <div>
                  {msgs.map((msg) => {
                    const isActive = activeMessageId === msg.id || activeMessageId === msg.thread_id;
                    const unread = !msg.read;
                    const senderName = msg.sender.split("<")[0].trim() || msg.sender;
                    
                    return (
                      <button
                        key={msg.id}
                        onClick={() => setActiveMessageId(msg.thread_id || msg.id)}
                        className={`
                          w-full text-left p-4 border-b border-gray-50 transition-all
                          ${isActive ? "bg-indigo-50/50 relative" : "hover:bg-gray-50 bg-white"}
                        `}
                      >
                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r" />}
                        
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex space-x-1 overflow-hidden">
                            {/* In a real app we'd map over actual labels/tags. For now we can show a placeholder or nothing */}
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{formatListDate(msg.date)}</span>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex flex-shrink-0 items-center justify-center font-bold text-sm mr-3">
                            {senderName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className={`text-sm truncate ${unread ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
                                {senderName}
                                {msg.thread_count && msg.thread_count > 1 && (
                                  <span className="text-gray-400 font-normal ml-1">({msg.thread_count})</span>
                                )}
                              </h4>
                              {unread && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />}
                            </div>
                            <h5 className={`text-sm truncate mt-0.5 ${unread ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                              {msg.subject || "(No subject)"}
                            </h5>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                              {getSnippetText(msg.snippet) || "..."}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- COLUMN 3: THREAD DETAIL --- */}
      <div 
        className={`
          flex-1 flex flex-col bg-[#fcfcfd] transition-transform duration-300 ease-in-out absolute lg:relative w-full h-full z-20 lg:z-auto lg:translate-x-0
          ${isThreadOpenOnMobile ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        {activeThreadId ? (
          <>
            {/* Toolbar */}
            <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 flex-shrink-0 shadow-sm z-10">
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => setActiveMessageId(null)}
                  className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-md lg:hidden mr-1"
                >
                  <ArrowLeft size={20} />
                </button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-colors" title="Archive">
                  <Archive size={20} />
                </button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-colors" title="Delete">
                  <Trash size={20} />
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-colors" title="Bookmark">
                  <BookmarkSimple size={20} />
                </button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-colors" title="Tag">
                  <Tag size={20} />
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                  <DotsThree size={24} weight="bold" />
                </button>
              </div>
            </div>

            {/* Thread Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              {/* Thread Header */}
              {activeEmail && (
                <div className="mb-8 flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg mr-4">
                    {activeEmail.sender.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{activeEmail.subject || "(No subject)"}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{activeEmail.sender}</p>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="space-y-6 mb-8">
                {threadEmails.map((msg) => {
                  // For the UI demonstration, let's treat any email not from the "sender" of the activeEmail as "Me"
                  // Alternatively, we could check if msg.sender includes our mailbox email address.
                  // Since we don't have the current user's email easily accessible right here without another hook,
                  // we'll guess based on if it matches the thread starter.
                  const isMe = activeEmail && msg.sender !== activeEmail.sender;
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <span className="text-xs text-gray-400 mb-1.5 px-1">{formatShortDate(msg.date)}</span>
                      <div className={`
                        max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl shadow-sm
                        ${isMe 
                          ? "bg-slate-700 text-white rounded-tr-sm" 
                          : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                        }
                      `}>
                        <div className="text-[15px] leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: msg.body || msg.snippet || "" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compose Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="border border-gray-200 rounded-xl bg-gray-50 focus-within:bg-white focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all overflow-hidden shadow-sm">
                <textarea 
                  placeholder="Type a message..."
                  className="w-full bg-transparent border-none focus:ring-0 resize-none p-4 min-h-[80px] text-[15px] outline-none"
                />
                <div className="flex items-center justify-between p-2 bg-white border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
                      Response templates
                    </button>
                    <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                      <Plus size={20} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                      <Smiley size={20} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                      <TextAa size={20} />
                    </button>
                  </div>
                  <button className="flex items-center px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
                    <span>Send</span>
                    <PaperPlaneRight size={16} className="ml-2" weight="fill" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 hidden lg:flex">
            <Inbox size={64} weight="light" className="mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-500">No message selected</h3>
            <p className="text-sm mt-1 text-gray-400">Select a message from the list to read it here.</p>
          </div>
        )}
      </div>

    </div>
  );
}
