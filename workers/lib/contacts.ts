// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { createMiddleware } from "hono/factory";
import type { ContactsDO } from "../durableObject";
import type { Env } from "../types";

export type ContactsContext = {
	Bindings: Env;
	Variables: {
		contactsStub: DurableObjectStub<ContactsDO>;
	};
};

export async function mineContacts(
	stub: DurableObjectStub<ContactsDO>,
	emails: Array<{ address?: string; name?: string } | string>
) {
	const uniqueContacts = new Map<string, string>();
	for (const c of emails) {
		if (!c) continue;
		let address = "";
		let name = "";
		if (typeof c === "string") {
			// Basic parsing for "Name <email@domain.com>" or "email@domain.com"
			const match = c.match(/(.*?)<([^>]+)>/);
			if (match) {
				name = match[1].replace(/["']/g, "").trim();
				address = match[2].trim().toLowerCase();
			} else {
				address = c.trim().toLowerCase();
			}
		} else {
			address = (c.address || "").trim().toLowerCase();
			name = (c.name || "").trim();
		}
		
		if (address) {
			if (!uniqueContacts.has(address) || (name && !uniqueContacts.get(address))) {
				uniqueContacts.set(address, name);
			}
		}
	}
	
	const promises: Promise<void>[] = [];
	for (const [address, name] of uniqueContacts.entries()) {
		promises.push(stub.upsertContact({ email: address, name }).catch((e) => console.error("Contact upsert failed:", e)));
	}
	await Promise.all(promises);
}

export const requireContacts = createMiddleware<ContactsContext>(async (c, next) => {
	const rawId = c.req.param("mailboxId");
	if (!rawId) return c.json({ error: "Mailbox ID required" }, 400);
	const mailboxId = decodeURIComponent(rawId);

	// Verify mailbox exists
	const key = `mailboxes/${mailboxId}.json`;
	const obj = await c.env.BUCKET.head(key);
	if (!obj) {
		return c.json({ error: "Not found" }, 404);
	}

	// Instantiate DO stub
	const ns = c.env.CONTACTS;
	const id = ns.idFromName(mailboxId);
	const stub = ns.get(id);

	c.set("contactsStub", stub);
	
	await next();
});
