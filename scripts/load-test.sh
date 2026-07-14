#!/usr/bin/env bash
#
# load-test.sh — verify the Delta LMS backend load balancer
# ---------------------------------------------------------------------------
# Usage:
#   ./scripts/load-test.sh distribution [URL]     # who serves the requests?
#   ./scripts/load-test.sh throughput   [URL]     # req/sec + latency (autocannon)
#   ./scripts/load-test.sh failover     [URL] [PM2_ID]
#   ./scripts/load-test.sh cron                   # confirm cron runs on 1 instance
#   ./scripts/load-test.sh all          [URL]     # distribution + throughput
#
# Defaults: URL = https://api-lms.deltainstitutions.com
#
# Requires: curl, jq. throughput additionally uses `npx autocannon` (auto-fetched).
#
# ⚠️  Before `throughput`: bypass the app rate limit or you'll just measure 429s.
#     On the server:  export DISABLE_RATE_LIMIT=true && pm2 reload ecosystem.config.js
#     After testing:   unset DISABLE_RATE_LIMIT   && pm2 reload ecosystem.config.js
set -euo pipefail

CMD="${1:-all}"
BASE_URL="${2:-https://api-lms.deltainstitutions.com}"
HEALTH="${BASE_URL%/}/api/v1/health"

need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ '$1' is required but not installed."; exit 1; }; }

distribution() {
  need curl; need jq
  local n="${REQUESTS:-40}" par="${PARALLEL:-8}"
  echo "▶ Distribution test: $n requests → $HEALTH (parallel $par)"
  echo "  Counting how many requests each backend instance (pid) served:"
  seq 1 "$n" | xargs -P "$par" -I{} curl -s "$HEALTH" \
    | jq -r '.data.pid // "ERR"' | sort | uniq -c | sort -rn \
    | awk '{ printf "    %-6s requests → pid %s\n", $1, $2 }'
  echo "  ✅ Even spread across pids = load balancing works. All on one pid = misconfigured."
}

throughput() {
  need curl
  local conns="${CONNECTIONS:-100}" dur="${DURATION:-20}"
  echo "▶ Throughput test: $conns connections for ${dur}s → $HEALTH"
  echo "  (If Non-2xx is high, the rate limit is still on — see DISABLE_RATE_LIMIT note above.)"
  npx --yes autocannon -c "$conns" -d "$dur" "$HEALTH"
}

failover() {
  need curl; need jq
  local pm2_id="${3:-}"
  command -v pm2 >/dev/null 2>&1 || { echo "❌ pm2 not found — run this on the server."; exit 1; }
  [ -n "$pm2_id" ] || { echo "Usage: $0 failover [URL] [PM2_ID]  (see 'pm2 list' for the id)"; exit 1; }
  echo "▶ Failover test: stopping instance $pm2_id, then hammering the site"
  pm2 stop "$pm2_id"
  echo "  HTTP status codes with instance $pm2_id DOWN:"
  seq 1 30 | xargs -P 6 -I{} curl -s -o /dev/null -w "%{http_code}\n" "$HEALTH" | sort | uniq -c
  pm2 start "$pm2_id"
  echo "  ✅ All 200 = nginx routed around the dead instance. Instance $pm2_id restarted."
}

cron_check() {
  command -v pm2 >/dev/null 2>&1 || { echo "❌ pm2 not found — run this on the server."; exit 1; }
  echo "▶ Cron test: only ONE instance should schedule reminder jobs"
  pm2 logs lms-backend --lines 300 --nostream 2>/dev/null | grep -E "Reminder cron" || \
    echo "  (no cron log lines found — check the app has booted)"
  echo "  ✅ Expect one 'started (primary instance)' + the rest 'skipped'."
}

case "$CMD" in
  distribution) distribution ;;
  throughput)   throughput ;;
  failover)     failover "$@" ;;
  cron)         cron_check ;;
  all)          distribution; echo; throughput ;;
  *) echo "Usage: $0 {distribution|throughput|failover|cron|all} [URL] [PM2_ID]"; exit 1 ;;
esac
