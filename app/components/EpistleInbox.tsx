import React, { useState } from "react";
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

// --- Mock Data ---

const NAV_ITEMS = [
  { id: "inbox", label: "Inbox", icon: Inbox, count: 10 },
  { id: "important", label: "Important", icon: Star, count: 0 },
  { id: "snoozed", label: "Snoozed", icon: Clock, count: 0 },
  { id: "draft", label: "Draft", icon: FileText, count: 8 },
  { id: "sent", label: "Sent", icon: Send, count: 0 },
];

const CATEGORIES = [
  { id: "collab", label: "Collaboration", color: "bg-blue-400", count: 3 },
  { id: "updates", label: "Updates", color: "bg-green-400", count: 14 },
  { id: "invoices", label: "Invoices", color: "bg-purple-400", count: 0 },
  { id: "topic1", label: "Project Alpha", color: "bg-orange-400", count: 0 },
  { id: "topic2", label: "Marketing", color: "bg-pink-400", count: 0 },
  { id: "topic3", label: "Design", color: "bg-teal-400", count: 0 },
];

const CONTACTS = [
  { id: "c1", name: "Alice Freeman", avatar: "A" },
  { id: "c2", name: "Bob Smith", avatar: "B" },
  { id: "c3", name: "Charlie Davis", avatar: "C" },
];

const MESSAGES = [
  {
    id: "m1",
    dateGroup: "Today",
    sender: "Alice Freeman",
    avatar: "A",
    topic: "Project Alpha Sync",
    tags: ["Project Alpha", "Collaboration"],
    timestamp: "10:30 AM",
    preview: "Are we still on for the sync later today? I have a few updates regarding the timeline.",
    unread: true,
  },
  {
    id: "m2",
    dateGroup: "Today",
    sender: "Bob Smith",
    avatar: "B",
    topic: "Weekly Updates",
    tags: ["Updates"],
    timestamp: "9:15 AM",
    preview: "Here are the metrics for last week. Engagement is up by 15% across all channels.",
    unread: false,
  },
  {
    id: "m3",
    dateGroup: "January 6",
    sender: "Charlie Davis",
    avatar: "C",
    topic: "New Design Assets",
    tags: ["Design", "Project Alpha"],
    timestamp: "Jan 6",
    preview: "I've attached the latest figma files. Let me know if you need any adjustments before the presentation.",
    unread: false,
  },
];

const THREAD_MESSAGES = [
  {
    id: "t1",
    sender: "Alice Freeman",
    avatar: "A",
    isMe: false,
    timestamp: "10:30 AM",
    content: "Are we still on for the sync later today? I have a few updates regarding the timeline that we should discuss before the client call tomorrow."
  },
  {
    id: "t2",
    sender: "Me",
    avatar: "M",
    isMe: true,
    timestamp: "10:45 AM",
    content: "Yes, definitely! I've reviewed the preliminary notes you sent over. Can you also bring the revised budget estimates?"
  },
  {
    id: "t3",
    sender: "Alice Freeman",
    avatar: "A",
    isMe: false,
    timestamp: "10:50 AM",
    content: "Will do. See you at 2 PM."
  }
];

export default function EpistleInbox() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  // Group messages by dateGroup
  const groupedMessages = MESSAGES.reduce((acc, msg) => {
    if (!acc[msg.dateGroup]) acc[msg.dateGroup] = [];
    acc[msg.dateGroup].push(msg);
    return acc;
  }, {} as Record<string, typeof MESSAGES>);

  const isThreadOpenOnMobile = activeMessageId !== null;
  const isSidebarCollapsed = desktopCollapsed;

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
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button 
                  key={item.id}
                  className={`
                    w-full flex items-center rounded-md py-2 px-3 transition-colors
                    ${item.id === "inbox" ? "bg-gray-200 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-100"}
                    ${isSidebarCollapsed ? "justify-center" : "justify-between"}
                  `}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center">
                    <Icon size={20} weight={item.id === "inbox" ? "fill" : "regular"} />
                    {!isSidebarCollapsed && <span className="ml-3">{item.label}</span>}
                  </div>
                  {!isSidebarCollapsed && item.count > 0 && (
                    <span className="text-xs font-semibold text-gray-500">{item.count}</span>
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
          <div className="mt-8 px-3">
            {!isSidebarCollapsed && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                Categories
              </h3>
            )}
            <div className="space-y-1">
              {CATEGORIES.map((cat) => (
                <button 
                  key={cat.id}
                  className={`
                    w-full flex items-center rounded-md py-1.5 px-3 hover:bg-gray-100 transition-colors text-gray-600
                    ${isSidebarCollapsed ? "justify-center" : "justify-between"}
                  `}
                  title={isSidebarCollapsed ? cat.label : undefined}
                >
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-sm ${cat.color}`} />
                    {!isSidebarCollapsed && <span className="ml-3 text-sm truncate max-w-[120px] text-left">{cat.label}</span>}
                  </div>
                  {!isSidebarCollapsed && cat.count > 0 && (
                    <span className="text-xs text-gray-400">{cat.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Contacts */}
          <div className="mt-8 px-3 mb-6">
            {!isSidebarCollapsed && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                Contacts
              </h3>
            )}
            <div className="space-y-1">
              {CONTACTS.map((contact) => (
                <button 
                  key={contact.id}
                  className={`
                    w-full flex items-center rounded-md py-1.5 px-3 hover:bg-gray-100 transition-colors
                    ${isSidebarCollapsed ? "justify-center" : "justify-start"}
                  `}
                  title={isSidebarCollapsed ? contact.name : undefined}
                >
                  <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {contact.avatar}
                  </div>
                  {!isSidebarCollapsed && <span className="ml-3 text-sm text-gray-600 truncate">{contact.name}</span>}
                </button>
              ))}
            </div>
          </div>
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
          <h1 className="font-semibold text-lg">Inbox</h1>
        </div>

        {/* Filter Tabs */}
        <div className="p-4 border-b border-gray-100 overflow-x-auto no-scrollbar whitespace-nowrap">
          <div className="flex space-x-2">
            <button className="px-3 py-1.5 bg-slate-700 text-white text-sm rounded-full font-medium shadow-sm">
              All messages (25)
            </button>
            <button className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm rounded-full font-medium transition-colors">
              Unread (10)
            </button>
            <button className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm rounded-full font-medium transition-colors">
              Project Alpha
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date} className="mb-4">
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-4 py-2 text-xs font-semibold text-gray-500">
                {date}
              </div>
              <div>
                {msgs.map((msg) => {
                  const isActive = activeMessageId === msg.id;
                  return (
                    <button
                      key={msg.id}
                      onClick={() => setActiveMessageId(msg.id)}
                      className={`
                        w-full text-left p-4 border-b border-gray-50 transition-all
                        ${isActive ? "bg-indigo-50/50 relative" : "hover:bg-gray-50 bg-white"}
                      `}
                    >
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r" />}
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex space-x-1 overflow-hidden">
                          {msg.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] uppercase font-bold tracking-wider rounded-sm whitespace-nowrap">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{msg.timestamp}</span>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex flex-shrink-0 items-center justify-center font-bold text-sm mr-3">
                          {msg.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm truncate ${msg.unread ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
                              {msg.sender}
                            </h4>
                            {msg.unread && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />}
                          </div>
                          <h5 className={`text-sm truncate mt-0.5 ${msg.unread ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                            {msg.topic}
                          </h5>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            {msg.preview}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- COLUMN 3: THREAD DETAIL --- */}
      <div 
        className={`
          flex-1 flex flex-col bg-[#fcfcfd] transition-transform duration-300 ease-in-out absolute lg:relative w-full h-full z-20 lg:z-auto lg:translate-x-0
          ${isThreadOpenOnMobile ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        {activeMessageId ? (
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
                <div className="hidden sm:flex space-x-2 mr-2">
                  <span className="flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    Project Alpha
                    <button className="ml-1.5 hover:text-gray-900">&times;</button>
                  </span>
                  <span className="flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    Collaboration
                    <button className="ml-1.5 hover:text-gray-900">&times;</button>
                  </span>
                </div>
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                  <DotsThree size={24} weight="bold" />
                </button>
              </div>
            </div>

            {/* Thread Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              {/* Thread Header */}
              <div className="mb-8 flex items-center">
                <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg mr-4">
                  A
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Project Alpha Sync</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Alice Freeman &lt;alice@example.com&gt;</p>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-6 mb-8">
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider bg-[#fcfcfd] px-2">Today</span>
                </div>
                
                {THREAD_MESSAGES.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
                    <span className="text-xs text-gray-400 mb-1.5 px-1">{msg.timestamp}</span>
                    <div className={`
                      max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl shadow-sm
                      ${msg.isMe 
                        ? "bg-slate-700 text-white rounded-tr-sm" 
                        : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                      }
                    `}>
                      <p className="text-[15px] leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
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