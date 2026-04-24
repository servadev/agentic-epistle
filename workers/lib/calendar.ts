// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { createMiddleware } from "hono/factory";
import type { CalendarDO } from "../durableObject";
import type { Env } from "../types";

export type CalendarContext = {
	Bindings: Env;
	Variables: {
		calendarStub: DurableObjectStub<CalendarDO>;
	};
};

export const requireCalendar = createMiddleware<CalendarContext>(async (c, next) => {
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
	const ns = c.env.CALENDAR;
	const id = ns.idFromName(mailboxId);
	const stub = ns.get(id);

	c.set("calendarStub", stub);
	
	await next();
});
