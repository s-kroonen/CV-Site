# MCP server (AI access)

The site exposes its content to AI tools through a small MCP server at
`/api/mcp` (Streamable HTTP, stateless). A connected assistant can read the
CV content and add, edit, archive, trash and restore items, upload images and
update the profile - the same operations as the admin panel, validated by the
same rules.

## Easiest: sign in with OAuth (claude.ai, Claude Desktop)

The server speaks OAuth 2.1 (discovery, dynamic client registration, PKCE), so
apps that support remote MCP servers can connect without a token you paste in:

- **claude.ai**: Settings -> Connectors -> *Add custom connector*, URL
  `https://storm.amber.kroon-en.nl/api/mcp`. It opens a consent page on your site.
- **Claude Desktop / Claude Code / mcp-remote**: just give the URL and no
  `Authorization` header; they open the same consent page in your browser.

On the consent page you sign in with your admin passkey (if you are not already)
and choose what the app may do. Apps get a one-hour access token that renews
itself; manage and disconnect them under Admin -> AI access -> *Connected apps*.
Only `SITE_URL` must be correct (it is the public address advertised to clients).

## 1. Or create a token by hand

Admin -> **AI access (MCP)** -> *New token*. Give it a name, choose the access
level and optionally an expiry. The token (`cvmcp_...`) is shown **once**.

| Access | Allows |
| --- | --- |
| read (always) | list/get items, profile, tags |
| write | create, update, archive/trash/restore, upload images, update profile |
| private | read/update the private email and phone (needs write for updates) |

Revoke a token at any time on the same page; it stops working immediately.
Every change and every failed call is listed under *Recent activity*.

## 2. Connect a client

Replace the URL with your site (`https://storm.amber.kroon-en.nl/api/mcp`, or
`http://localhost:3000/api/mcp` for local testing) and `TOKEN` with your token.

**Claude Code**

```bash
claude mcp add --transport http cv-site https://storm.amber.kroon-en.nl/api/mcp \
  --header "Authorization: Bearer TOKEN"
```

**Claude Desktop** (`claude_desktop_config.json`, via the `mcp-remote` bridge)

```json
{
  "mcpServers": {
    "cv-site": {
      "command": "npx",
      "args": ["mcp-remote", "https://storm.amber.kroon-en.nl/api/mcp", "--header", "Authorization:${AUTH}"],
      "env": { "AUTH": "Bearer TOKEN" }
    }
  }
}
```

**Quick check with curl**

```bash
curl -s -X POST https://storm.amber.kroon-en.nl/api/mcp \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Tools

`describe_entity`, `list_items`, `get_item`, `create_item`, `update_item`,
`set_item_state` (archive / unarchive / trash / restore), `get_profile`,
`update_profile`, `list_tags`, `upload_image`, and with the private scope
`get_private_contact` / `update_private_contact`. Tools a token has no access
to are not listed.

Permanent deletion is deliberately not available here: "delete" moves an item
to the trash, from where it can be restored or purged in the admin panel.

## Security notes

- Tokens are stored hashed; a leaked database does not leak usable tokens.
- Requests carrying an `Origin` header that is not `SITE_URL` are rejected
  (browsers cannot drive the endpoint from other sites).
- Rate limit: 120 requests per minute per token (per host).
- The endpoint sits behind your reverse proxy like the rest of the site; make
  sure it forwards the `Authorization` header (Nginx Proxy Manager does by
  default).
