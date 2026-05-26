#!/usr/bin/env bash
# Smoke test — Railway production
# Usage: ./scripts/test-production.sh [output.md]

set -u

BASE="${BASE_URL:-https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app}"
API="$BASE/api/v1"
SLOW_TIMEOUT=120
FAST_TIMEOUT=30
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
TEST_EMAIL="fesmoke$(date +%s)@gmail.com"
TEST_PASS="SmokeTest123!"

RESULTS_FILE="${1:-}"

PASS=0
FAIL=0
SKIP=0

# name|method|url|auth|body|expect_codes|timeout
log_row() {
  echo "$1|$2|$3|$4|$5|$6|$7"
}

run_test() {
  local name="$1"
  local method="$2"
  local url="$3"
  local auth="${4:-}"
  local body="${5:-}"
  local expect="${6:-200}"
  local timeout="${7:-$FAST_TIMEOUT}"

  local curl_args=(-s -w "\n%{http_code}\n%{time_total}" -m "$timeout" -X "$method")
  curl_args+=(-H "Accept: application/json")

  if [[ -n "$body" ]]; then
    curl_args+=(-H "Content-Type: application/json" -d "$body")
  fi
  if [[ -n "$auth" ]]; then
    curl_args+=(-H "Authorization: Bearer $auth")
  fi

  local out
  out=$(curl "${curl_args[@]}" "$url" 2>&1) || true

  local code time_total
  code=$(echo "$out" | tail -2 | head -1)
  time_total=$(echo "$out" | tail -1)
  local body_preview
  body_preview=$(echo "$out" | sed '$d' | sed '$d' | head -c 120 | tr '\n' ' ')

  local status="FAIL"
  if echo ",$expect," | grep -q ",$code,"; then
    status="PASS"
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi

  printf "| %s | %s | \`%s\` | %s | %s | %s | %ss | %s |\n" \
    "$name" "$method" "${url#$BASE}" "$code" "$expect" "$status" "$time_total" "${body_preview:0:80}"

  log_row "$name" "$method" "$url" "$code" "$status" "$time_total" "$body_preview"
}

echo "Testing $BASE at $TS"
echo ""

if [[ -n "$RESULTS_FILE" ]]; then
  {
    echo "# Smoke test results"
    echo ""
    echo "- **When:** $TS"
    echo "- **Base:** $BASE"
    echo ""
    echo "| Test | Method | Path | HTTP | Expected | Result | Time | Note |"
    echo "|------|--------|------|------|----------|--------|------|------|"
  } >>"$RESULTS_FILE"
fi

_run() {
  run_test "$@"
}

# --- System ---
_run "health" GET "$BASE/health" "" "" "200"
_run "openapi-json" GET "$BASE/api-docs.json" "" "" "200"

# --- Auth ---
REG_BODY="{\"name\":\"FE Smoke\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"role\":\"student\"}"
REG_OUT=$(curl -s -m "$FAST_TIMEOUT" -X POST -H "Content-Type: application/json" -d "$REG_BODY" "$API/auth/register")
TOKEN=$(echo "$REG_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null || echo "")

if [[ -z "$TOKEN" ]]; then
  LOGIN_OUT=$(curl -s -m "$FAST_TIMEOUT" -X POST -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" "$API/auth/login")
  TOKEN=$(echo "$LOGIN_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null || echo "")
fi

_run "auth-register" POST "$API/auth/register" "" "$REG_BODY" "201,409"
_run "auth-login" POST "$API/auth/login" "" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" "200"

if [[ -n "$TOKEN" ]]; then
  _run "auth-me" GET "$API/auth/me" "$TOKEN" "" "200"
else
  echo "| auth-me | GET | /api/v1/auth/me | - | 200 | SKIP | - | no token |"
  SKIP=$((SKIP + 1))
fi

# --- AI proxy ---
_run "ai-health" GET "$API/ai/health" "" "" "200"
_run "ai-embed" POST "$API/ai/embeddings/embed" "" '{"text":"machine learning healthcare"}' "200" "$SLOW_TIMEOUT"
_run "ai-embed-batch" POST "$API/ai/embeddings/embed-batch" "" '{"texts":["deep learning","neural networks"]}' "200" "$SLOW_TIMEOUT"
_run "ai-similarity" POST "$API/ai/embeddings/similarity" "" '{"text1":"deep learning","text2":"machine learning"}' "200" "$SLOW_TIMEOUT"
_run "ai-recommend-papers" POST "$API/ai/recommendations/papers" "" \
  '{"userInterests":["AI"],"topN":2,"candidatePapers":[{"paperId":"p1","title":"Deep Learning","abstract":"Neural networks for vision","keywords":["AI"]}]}' \
  "200" "$SLOW_TIMEOUT"
_run "ai-research-directions" POST "$API/ai/recommendations/research-directions" "" '{"keywords":["federated learning","privacy"]}' "200" "$SLOW_TIMEOUT"
_run "ai-summarize" POST "$API/ai/summarization/abstract" "" \
  '{"abstract":"We propose a novel method for medical imaging. Results show 95% accuracy.","maxLength":80}' \
  "200" "$SLOW_TIMEOUT"
_run "ai-extract-problem" POST "$API/ai/summarization/extract-problem" "" \
  '{"abstract":"Diagnosis is hard. We use CNNs. Our method achieves high accuracy."}' \
  "200" "$SLOW_TIMEOUT"

# --- Sources ---
_run "sources-search" GET "$API/sources/search?keyword=machine%20learning&limit=5" "" "" "200,504" "$SLOW_TIMEOUT"
_run "sources-trend" GET "$API/sources/trend?keyword=AI&startYear=2020" "" "" "200,504" "$SLOW_TIMEOUT"
_run "sources-journal" GET "$API/sources/journal?query=nature" "" "" "200,504" "$SLOW_TIMEOUT"
_run "sources-author" GET "$API/sources/author?query=Hinton" "" "" "200,504" "$SLOW_TIMEOUT"

# --- Papers live ---
_run "papers-search" GET "$API/papers/search?keyword=AI&limit=5" "" "" "200,504" "$SLOW_TIMEOUT"

# --- Corpus ---
CORPUS_BODY='{"seedKeyword":"federated learning","startYear":2022,"endYear":2024,"maxPages":1,"perPage":5}'
CORPUS_OUT=$(curl -s -m "$FAST_TIMEOUT" -X POST -H "Content-Type: application/json" -d "$CORPUS_BODY" "$API/corpus/runs")
RUN_ID=$(echo "$CORPUS_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('run',{}); print(r.get('_id', r.get('id','')))" 2>/dev/null || echo "")

_run "corpus-create-run" POST "$API/corpus/runs" "" "$CORPUS_BODY" "202"
_run "corpus-list-runs" GET "$API/corpus/runs" "" "" "200"

if [[ -n "$RUN_ID" && "$RUN_ID" != "None" ]]; then
  for i in 1 2 3 4 5 6 7 8 9 10; do
    RUN_STATUS=$(curl -s -m "$FAST_TIMEOUT" "$API/corpus/runs/$RUN_ID" | python3 -c "import sys,json; print(json.load(sys.stdin).get('run',{}).get('status',''))" 2>/dev/null || echo "")
    if [[ "$RUN_STATUS" == "completed" || "$RUN_STATUS" == "failed" ]]; then
      break
    fi
    sleep 5
  done
  _run "corpus-get-run" GET "$API/corpus/runs/$RUN_ID" "" "" "200"
  _run "corpus-get-papers" GET "$API/corpus/runs/$RUN_ID/papers" "" "" "200"
  if [[ -n "$TOKEN" ]]; then
    _run "corpus-follow" POST "$API/corpus/runs/$RUN_ID/follow" "$TOKEN" "" "200"
    _run "corpus-me-tracked" GET "$API/corpus/me/tracked" "$TOKEN" "" "200"
  fi
else
  echo "| corpus-get-run | GET | /corpus/runs/{id} | - | 200 | SKIP | - | no run id |"
  SKIP=$((SKIP + 1))
fi

# --- Trends ---
_run "trends-keyword" GET "$API/trends/keyword?keyword=machine%20learning&startYear=2020" "" "" "200,504" "$SLOW_TIMEOUT"
_run "trends-compare" POST "$API/trends/compare" "" '{"keywords":["AI","blockchain"],"startYear":2020}' "200,504" "$SLOW_TIMEOUT"
_run "trends-emerging" GET "$API/trends/emerging?limit=5" "" "" "200"
_run "trends-trending" GET "$API/trends/trending?limit=5" "" "" "200"

# --- Notifications (JWT) ---
if [[ -n "$TOKEN" ]]; then
  _run "notifications-list" GET "$API/notifications?limit=5" "$TOKEN" "" "200"
  _run "notifications-unread" GET "$API/notifications/unread-count" "$TOKEN" "" "200"
else
  echo "| notifications-list | GET | /api/v1/notifications | - | 200 | SKIP | - | no token |"
  SKIP=$((SKIP + 1))
fi

# --- Papers DB (JWT) ---
if [[ -n "$TOKEN" ]]; then
  _run "papers-bookmarks" GET "$API/papers/bookmarks" "$TOKEN" "" "200"
  _run "papers-save" POST "$API/papers" "$TOKEN" "{\"paper\":{\"title\":\"Smoke Test $TS\",\"abstract\":\"Test\",\"source\":\"openalex\",\"publicationYear\":2024,\"externalIds\":{\"openalex\":\"smoke-$TEST_EMAIL\"}}}" "201,409"
else
  echo "| papers-bookmarks | GET | /api/v1/papers/bookmarks | - | 200 | SKIP | - | no token |"
  SKIP=$((SKIP + 1))
fi

echo ""
echo "--- Summary: PASS=$PASS FAIL=$FAIL SKIP=$SKIP (at $TS) ---"

if [[ -n "$RESULTS_FILE" ]]; then
  {
    echo ""
    echo "**Summary:** PASS=$PASS FAIL=$FAIL SKIP=$SKIP"
  } >>"$RESULTS_FILE"
fi

exit 0
