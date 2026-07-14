#!/usr/bin/env bash
#
# capacity-test.sh — measure REAL concurrent-user capacity of the LMS backend
# ---------------------------------------------------------------------------
# Logs in once, reuses the session cookie, and load-tests a real DB-backed
# authenticated endpoint (default: GET /api/v1/auth/me). Then converts the
# measured requests/sec into an estimated number of simultaneous ACTIVE users.
#
# Why localhost:4000 by default?
#   - Bypasses any CDN/WAF (Cloudflare) in front of the public domain.
#   - Bypasses nginx, measuring ONE Bun instance's raw capacity, which we then
#     multiply by the instance count for the cluster estimate.
#
# ⚠️  REQUIRED for a true ceiling: bypass the app rate limit first, or you'll
#     just measure the 100/min limiter. On the server:
#        echo "DISABLE_RATE_LIMIT=true" >> backend/.env
#        pm2 delete lms-backend && pm2 start ecosystem.config.js
#     …and REMOVE it again when done.
#
# Usage:
#   EMAIL=you@example.com PASSWORD='secret' ./scripts/capacity-test.sh
#
# Tunables (env vars):
#   BASE_URL      default http://localhost:4000   (a single instance)
#   ENDPOINT      default /api/v1/auth/me          (try /api/v1/courses/?per_page=12)
#   CONNECTIONS   default 50                       (concurrent connections)
#   DURATION      default 20                       (seconds)
#   INSTANCES     default 4                        (how many to extrapolate to)
#   REQ_PER_USER  default 0.2                      (avg req/sec per active user)
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
EMAIL="${EMAIL:-}"
PASSWORD="${PASSWORD:-}"
CONNECTIONS="${CONNECTIONS:-50}"
DURATION="${DURATION:-20}"
INSTANCES="${INSTANCES:-4}"
REQ_PER_USER="${REQ_PER_USER:-0.2}"

command -v curl >/dev/null || { echo "❌ curl required"; exit 1; }
command -v jq   >/dev/null || { echo "❌ jq required";   exit 1; }

COOKIE=""
if [ -n "$EMAIL" ] && [ -n "$PASSWORD" ]; then
  # ── Authenticated mode: log in once, reuse the cookie ──
  ENDPOINT="${ENDPOINT:-/api/v1/auth/me}"
  echo "▶ Logging in as $EMAIL at $BASE_URL …"
  COOKIE=$(curl -s -i -X POST "$BASE_URL/api/v1/auth/login" \
    -H 'content-type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
    | tr -d '\r' | grep -i '^set-cookie: *lms_at=' \
    | sed -E 's/^[Ss]et-[Cc]ookie: *(lms_at=[^;]+).*/\1/' | head -1)
  [ -n "$COOKIE" ] || { echo "❌ Login failed — check the EMAIL/PASSWORD are a REAL account, and that $BASE_URL is up."; exit 1; }
else
  # ── Anonymous mode: no creds → test a public DB-backed endpoint ──
  ENDPOINT="${ENDPOINT:-/api/v1/courses/?per_page=12}"
  echo "▶ No EMAIL/PASSWORD given — testing PUBLIC endpoint anonymously: $ENDPOINT"
fi

# Sanity: endpoint must return 200 before we load-test
CODE=$(curl -s -o /dev/null -w '%{http_code}' ${COOKIE:+-H "cookie: $COOKIE"} "$BASE_URL$ENDPOINT")
[ "$CODE" = "200" ] || { echo "❌ $ENDPOINT returned $CODE (expected 200). Wrong endpoint, or auth needed?"; exit 1; }
echo "✅ $ENDPOINT responds 200 — starting load test."

echo "▶ Load testing $ENDPOINT  ($CONNECTIONS connections, ${DURATION}s, one instance)…"
JSON=$(npx --yes autocannon -c "$CONNECTIONS" -d "$DURATION" ${COOKIE:+-H "cookie: $COOKIE"} --json "$BASE_URL$ENDPOINT")

RPS=$(echo "$JSON"   | jq -r '.requests.mean')
OK=$(echo "$JSON"    | jq -r '.["2xx"]')
NON2XX=$(echo "$JSON"| jq -r '.non2xx')
P99=$(echo "$JSON"   | jq -r '.latency.p99')
LAT=$(echo "$JSON"   | jq -r '.latency.mean')

echo
echo "──────────── RESULTS (single instance) ────────────"
printf "  Requests/sec (mean) : %s\n" "$RPS"
printf "  2xx / non-2xx       : %s / %s\n" "$OK" "$NON2XX"
printf "  Latency mean / p99  : %s ms / %s ms\n" "$LAT" "$P99"

if [ "$(echo "$NON2XX" | awk '{print ($1>100)}')" = "1" ]; then
  echo
  echo "  ⚠️  High non-2xx — the rate limiter or a CDN is still active."
  echo "      Set DISABLE_RATE_LIMIT=true (see header) and test localhost to get a true ceiling."
fi

echo
echo "──────────── EXTRAPOLATION ────────────"
awk -v rps="$RPS" -v inst="$INSTANCES" -v rpu="$REQ_PER_USER" 'BEGIN {
  cluster = rps * inst;
  users   = cluster / rpu;
  printf "  Assumed instances            : %d\n", inst;
  printf "  Est. cluster req/sec         : %.0f  (single %.0f x %d, Mongo-permitting)\n", cluster, rps, inst;
  printf "  Assumed req/sec per user     : %.2f  (1 request every %.0fs)\n", rpu, 1/rpu;
  printf "  ➜  Est. concurrent ACTIVE users: %.0f\n", users;
}'
echo
echo "  Note: extrapolation assumes MongoDB scales linearly with instances."
echo "  The real cluster ceiling is often LOWER because all instances share one DB."
echo "  For the true cluster number, also run against the domain with INSTANCES=1."
