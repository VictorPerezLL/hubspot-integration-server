#!/usr/bin/env node
/**
 * HubSpot contact lookup by email, with support for archived (deleted) contacts.
 *
 * Usage:
 *   HS_PRIVATE_APP_KEY=... node scripts/hubspot-find-contact.js --email someone@example.com --include-archived --all-properties
 */
 
const DEFAULT_BASE_URL = "https://api.hubapi.com";
const DEFAULT_ASSOCIATIONS = ["companies", "deals", "tickets"];
 
function parseArgs(argv) {
  const args = {
    email: null,
    includeArchived: false,
    allProperties: false,
    associations: DEFAULT_ASSOCIATIONS,
    baseUrl: process.env.HS_BASE_URL || DEFAULT_BASE_URL,
  };
 
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") {
      args.email = argv[++i] || null;
    } else if (a === "--include-archived" || a === "--archived") {
      args.includeArchived = true;
    } else if (a === "--all-properties") {
      args.allProperties = true;
    } else if (a === "--associations") {
      const raw = argv[++i] || "";
      args.associations = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a === "--base-url") {
      args.baseUrl = argv[++i] || args.baseUrl;
    } else if (a === "--help" || a === "-h") {
      printHelpAndExit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      printHelpAndExit(2);
    }
  }
 
  return args;
}
 
function printHelpAndExit(code) {
  console.log(`
hubspot-find-contact
 
Required:
  --email <email>
 
Options:
  --include-archived | --archived   Also search archived (deleted) contacts
  --all-properties                 Fetch all contact properties (can be large)
  --associations a,b,c             Associations to include in getById (default: ${DEFAULT_ASSOCIATIONS.join(",")})
  --base-url <url>                 HubSpot base URL (default: ${DEFAULT_BASE_URL})
  -h, --help                       Show help
 
Env:
  HS_PRIVATE_APP_KEY or HS_TEST_PRIVATE_APP_KEY (HubSpot Private App token)
  HS_BASE_URL (optional)
`);
  process.exit(code);
}
 
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
 
function toQueryString(params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null) continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}
 
async function hsFetch(baseUrl, token, path, { method = "GET", query, body } = {}) {
  const url = `${baseUrl.replace(/\/+$/, "")}${path}${toQueryString(query)}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
 
  const maxAttempts = 6;
  let attempt = 0;
  // Exponential backoff on 429/5xx
  while (true) {
    attempt++;
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
 
    if (res.status === 204) return null;
 
    const text = await res.text();
    const payload = text ? safeJsonParse(text) : null;
 
    if (res.ok) return payload;
 
    const retryAfterHeader = res.headers.get("retry-after");
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
 
    const retriable = res.status === 429 || (res.status >= 500 && res.status <= 599);
    if (!retriable || attempt >= maxAttempts) {
      const err = new Error(
        `HubSpot API error ${res.status} ${res.statusText} for ${method} ${path}: ${text || "<empty body>"}`
      );
      err.status = res.status;
      err.payload = payload;
      throw err;
    }
 
    const backoffMs = retryAfterMs ?? Math.min(30_000, 250 * Math.pow(2, attempt));
    await sleep(backoffMs);
  }
}
 
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
 
async function findActiveContactIdByEmail(baseUrl, token, email) {
  const body = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "email",
            operator: "EQ",
            value: email,
          },
        ],
      },
    ],
    properties: ["email"],
    limit: 1,
  };
  const res = await hsFetch(baseUrl, token, "/crm/v3/objects/contacts/search", { method: "POST", body });
  const result = res?.results?.[0];
  return result?.id ? String(result.id) : null;
}
 
async function findArchivedContactIdByEmail(baseUrl, token, email) {
  const emailLc = email.toLowerCase();
  let after = undefined;
  let scanned = 0;
 
  while (true) {
    const page = await hsFetch(baseUrl, token, "/crm/v3/objects/contacts", {
      method: "GET",
      query: {
        archived: "true",
        limit: 100,
        after,
        properties: "email",
      },
    });
 
    const results = Array.isArray(page?.results) ? page.results : [];
    for (const r of results) {
      scanned++;
      const rEmail = r?.properties?.email;
      if (typeof rEmail === "string" && rEmail.toLowerCase() === emailLc) {
        return { id: String(r.id), scanned };
      }
    }
 
    if (scanned > 0 && scanned % 1000 === 0) {
      console.error(`Scanned ${scanned} archived contacts...`);
    }
 
    const nextAfter = page?.paging?.next?.after;
    if (!nextAfter) return { id: null, scanned };
    after = nextAfter;
  }
}
 
async function getContactById(baseUrl, token, id, { archived, associations }) {
  const query = {
    archived: archived ? "true" : "false",
  };
  if (associations && associations.length) {
    query.associations = associations.join(",");
  }
 
  return await hsFetch(baseUrl, token, `/crm/v3/objects/contacts/${encodeURIComponent(id)}`, {
    method: "GET",
    query,
  });
}
 
async function listContactPropertyNames(baseUrl, token) {
  const props = await hsFetch(baseUrl, token, "/crm/v3/properties/contacts", { method: "GET" });
  if (!Array.isArray(props)) return [];
  return props
    .map((p) => p?.name)
    .filter((n) => typeof n === "string" && n.length > 0);
}
 
async function batchReadContactProperties(baseUrl, token, id, propertyNames, { archived }) {
  const chunkSize = 200;
  const merged = {};
 
  for (let i = 0; i < propertyNames.length; i += chunkSize) {
    const chunk = propertyNames.slice(i, i + chunkSize);
    const res = await hsFetch(baseUrl, token, "/crm/v3/objects/contacts/batch/read", {
      method: "POST",
      query: { archived: archived ? "true" : "false" },
      body: {
        inputs: [{ id }],
        properties: chunk,
      },
    });
 
    const r0 = res?.results?.[0];
    const props = r0?.properties;
    if (props && typeof props === "object") {
      Object.assign(merged, props);
    }
  }
 
  return merged;
}
 
async function main() {
  const args = parseArgs(process.argv);
  if (!args.email) printHelpAndExit(2);
 
  const token = process.env.HS_PRIVATE_APP_KEY || process.env.HS_TEST_PRIVATE_APP_KEY;
  if (!token) {
    console.error("Missing HS_PRIVATE_APP_KEY (or HS_TEST_PRIVATE_APP_KEY) environment variable.");
    process.exit(2);
  }
 
  const email = args.email.trim();
  const baseUrl = args.baseUrl;
 
  const activeId = await findActiveContactIdByEmail(baseUrl, token, email);
  if (activeId) {
    const contact = await getContactById(baseUrl, token, activeId, {
      archived: false,
      associations: args.associations,
    });
 
    if (args.allProperties) {
      const names = await listContactPropertyNames(baseUrl, token);
      const allProps = await batchReadContactProperties(baseUrl, token, activeId, names, { archived: false });
      contact.properties = { ...(contact.properties || {}), ...allProps };
    }
 
    console.log(JSON.stringify({ found: true, archived: false, contact }, null, 2));
    return;
  }
 
  if (!args.includeArchived) {
    console.log(JSON.stringify({ found: false, archived: false, contact: null }, null, 2));
    return;
  }
 
  const archivedSearch = await findArchivedContactIdByEmail(baseUrl, token, email);
  if (!archivedSearch.id) {
    console.log(
      JSON.stringify(
        { found: false, archived: true, scannedArchivedContacts: archivedSearch.scanned, contact: null },
        null,
        2
      )
    );
    return;
  }
 
  const contact = await getContactById(baseUrl, token, archivedSearch.id, {
    archived: true,
    associations: args.associations,
  });
 
  if (args.allProperties) {
    const names = await listContactPropertyNames(baseUrl, token);
    const allProps = await batchReadContactProperties(baseUrl, token, archivedSearch.id, names, { archived: true });
    contact.properties = { ...(contact.properties || {}), ...allProps };
  }
 
  console.log(
    JSON.stringify(
      { found: true, archived: true, scannedArchivedContacts: archivedSearch.scanned, contact },
      null,
      2
    )
  );
}
 
main().catch((err) => {
  console.error(err?.message || err);
  if (err?.payload) {
    console.error("HubSpot payload:", JSON.stringify(err.payload, null, 2));
  }
  process.exit(1);
});

