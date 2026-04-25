// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import {
	index,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	index("routes/index.tsx"),
	route("home", "routes/home.tsx"),
	route("epistle", "routes/epistle-inbox.tsx"),
	route("mailbox/:mailboxId", "routes/mailbox.tsx", [
		index("routes/mailbox-index.tsx"),
		route("emails/:folder", "routes/email-list.tsx"),
		route("settings", "routes/settings.tsx"),
		route("search", "routes/search-results.tsx"),
		route("calendar", "routes/calendar.tsx"),
		route("contacts", "routes/contacts.tsx"),
	]),
	route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
