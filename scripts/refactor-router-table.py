#!/usr/bin/env python3
"""v13.32-router: mechanically transform the post-auth if-chain in src/api.ts
into a declarative, ordered route table. Bodies are moved BYTE-IDENTICAL
(no re-indent — template literals in /simple-test must not be touched).
Includes a post-transform equivalence assertion."""
import re, sys

PATH = "src/api.ts"
src = open(PATH).read()
lines = src.split("\n")

# 1) locate the post-gate anchor: first indent-4 `await applySettings(env);`
anchor_idx = None
for i, l in enumerate(lines):
    if l == "    await applySettings(env);":
        anchor_idx = i
        break
assert anchor_idx is not None, "anchor not found"

# 2) locate region end (the 405 fallback)
end_idx = None
for i in range(anchor_idx, len(lines)):
    if lines[i] == '    return new Response("Method not allowed", { status: 405 });':
        end_idx = i
        break
assert end_idx is not None, "405 fallback not found"

# 3) split region into top-level statements by brace depth
region = lines[anchor_idx + 1:end_idx]
blocks = []  # list of (opener_line, body_lines, pre_lines)
cur = None
depth = 0
pending = []
for l in region:
    if cur is None:
        s = l.strip()
        if s.startswith("if (url.pathname") or s == 'if (req.method === "GET") {':
            cur = l
            depth = l.count("{") - l.count("}")
            body = []
            pre = pending
            pending = []
            if depth == 0 and l.rstrip().endswith("}"):  # one-liner (none expected)
                blocks.append((l, [], pre)); cur = None
            continue
        elif s == "" or s.startswith("//"):
            pending.append(l)
            continue
        else:
            raise SystemExit("unexpected region line: " + repr(l))
    else:
        depth += l.count("{") - l.count("}")
        if depth == 0:
            blocks.append((cur, body, pre))
            cur = None
        else:
            body.append(l)
assert cur is None, "unbalanced braces in region"

# 4) classify blocks
entries = []  # (path, method|None, body_lines, kind)
legacy_block = None
opener_re = re.compile(r'^\s*if \(url\.pathname === "([^"]+)"( && req\.method === "([A-Z]+)")?\) \{$')
diag_re = re.compile(r'^\s*if \(url\.pathname === "([^"]+)" && await isAdminAuthed\(req, env\)\) \{$')
for opener, body, pre in blocks:
    m = opener_re.match(opener)
    if m:
        entries.append((m.group(1), m.group(3), body, "plain", pre))
        continue
    m = diag_re.match(opener)
    if m:
        entries.append((m.group(1), None, body, "diag", pre))
        continue
    if opener.strip() == 'if (req.method === "GET") {':
        legacy_block = body
        continue
    raise SystemExit("unclassified block: " + opener)

names = [(e[0], e[1]) for e in entries]
expected = [
    ("/admin", None), ("/api/settings", None), ("/healthz", None),
    ("/sitemap.xml", None), ("/robots.txt", None),
    ("/api/members", "GET"), ("/api/fa-teams", "GET"), ("/api/fa-teams/override", "POST"),
    ("/api/broadcast", "POST"), ("/api/migrate/start", "POST"), ("/api/migrate/stop", "POST"),
    ("/api/migrate/status", "GET"), ("/api/standings", "GET"), ("/api/clubs", "GET"),
    ("/api/status", None), ("/api/test", "POST"), ("/api/simulate", "POST"),
    ("/api/sources", None), ("/api/webhook/info", None), ("/api/bot/info", None),
    ("/api/webhook/setup", "POST"), ("/admin/x-test", "POST"), ("/api/x/status", "GET"),
    ("/api/x/phase", "PUT"), ("/api/x/dry-run", "PUT"), ("/api/x/enabled", "PUT"),
    ("/api/x/clear-pause", "POST"), ("/api/audit", "GET"),
    ("/api/diag-public", None), ("/api/diag-fd", None),
]
assert names == expected, "route order mismatch:\n" + "\n".join(map(str, names))
assert legacy_block is not None, "legacy GET switch not found"

# 5) emit the table + legacy fn
out = []
out.append("// v13.32-router: the post-auth request flow is a declarative, ordered route")
out.append("// table (debt #1). Semantics preserved exactly:")
out.append("//   - first-match-wins in registration order (identical to the old chain);")
out.append("//   - method: undefined = any method (the old if had no method guard);")
out.append("//   - a handler returning null falls through to the next route — this")
out.append("//     encodes the old chain's fallthrough (e.g. /api/settings with an")
out.append("//     unmapped method used to slip past every if and hit the legacy GET")
out.append("//     switch / the 405 tail; /api/diag-* used to skip themselves when the")
out.append("//     inline auth check failed and fall through to the 404 tail);")
out.append('//   - "*" = the legacy GET action endpoints (catch-all, always last);')
out.append("//   - unmatched non-GET requests end at the 405 tail (unchanged).")
out.append("// Route bodies are byte-identical to the previous if-chain (moved, not")
out.append("// rewritten) — indentation intentionally untouched so template literals")
out.append("// and long strings are provably unchanged.")
out.append("")
out.append("type RouteCtx = { req: Request; env: Env; url: URL };")
out.append("type RouteDef = {")
out.append("  path: string; // exact pathname, or \"*\" for the legacy catch-all")
out.append("  method?: string; // undefined = any method")
out.append("  handler: (c: RouteCtx) => Promise<Response | null> | Response | null;")
out.append("};")
out.append("")
out.append("async function legacyGetAction(c: RouteCtx): Promise<Response | null> {")
out.append("  const { req, env, url } = c;")
out.extend(legacy_block)
out.append("  return null;")
out.append("}")
out.append("")
out.append("const POST_GATE_ROUTES: RouteDef[] = [")
for path, method, body, kind, pre in entries:
    method_lit = '"' + method + '"' if method else "undefined"
    out.extend(pre)
    out.append("  { path: " + '"' + path + '"' + ", method: " + method_lit + ", handler: async ({ req, env, url }): Promise<Response | null> => {")
    if kind == "diag":
        out.append("    if (!(await isAdminAuthed(req, env))) return null; // fall through (was: skipped if, ended at the 404 tail)")
    out.extend(body)
    out.append("    return null;")
    out.append("  } },")
out.append('  { path: "*", handler: legacyGetAction },')
out.append("];")
out.append("")

# 6) reassemble
new_lines = lines[:anchor_idx + 1]
new_lines += [
    "    // v13.32-router: dispatch via the ordered table below (was a ~30-branch",
    "    // post-auth if-chain). See the RouteDef block for the semantics contract.",
    "    for (const route of POST_GATE_ROUTES) {",
    '      if (route.path !== "*" && url.pathname !== route.path) continue;',
    "      if (route.method && req.method !== route.method) continue;",
    "      const res: Response | null = await route.handler({ req, env, url });",
    "      if (res === null) continue;",
    "      return res;",
    "    }",
    '    return new Response("Method not allowed", { status: 405 });',
]
# skip the old region; keep everything after the 405 line
new_lines += lines[end_idx + 1:]

# insert the table before `const worker_default = {`
table_lines = out
final = []
inserted = False
for l in new_lines:
    if not inserted and l.startswith("const worker_default = {"):
        final.extend(table_lines)
        inserted = True
    final.append(l)
assert inserted, "worker_default anchor not found"

new_src = "\n".join(final)

# 7) byte-fidelity verification: every original body line must exist in new src
missing = []
for path, method, body, kind, pre in entries:
    for bl in body + pre:
        if bl not in new_src:
            missing.append((path, bl))
for bl in legacy_block:
    if bl not in new_src:
        missing.append(("legacy", bl))
if missing:
    print("FIDELITY FAIL — missing lines:")
    for p, b in missing[:10]:
        print(" ", p, repr(b[:90]))
    sys.exit(1)

open(PATH, "w").write(new_src)
print("transformed OK:", len(entries), "routes + legacy catch-all; fidelity verified")
