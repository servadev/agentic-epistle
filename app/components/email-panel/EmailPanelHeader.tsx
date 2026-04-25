// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

interface EmailPanelHeaderProps {
	subject: string;
	messageCount: number;
	showThreadCount: boolean;
}

export default function EmailPanelHeader({
	subject,
	messageCount,
	showThreadCount,
}: EmailPanelHeaderProps) {
	return (
		<div className="px-4 py-3 border-b border-slate-200 shrink-0 md:px-6 bg-white">
			<h2 className="text-xl font-bold text-slate-900">{subject}</h2>
			{showThreadCount && (
				<span className="text-sm text-slate-500 mt-1 block">
					{messageCount} messages in this thread
				</span>
			)}
		</div>
	);
}
