#!/usr/bin/env sh
set -eu

BASE_URL="${BASE_URL:-http://localhost:5173}"
ADMIN_EMAIL="${ADMIN_EMAIL:-portfolio.owner@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-peaceful123}"
COOKIE_JAR="$(mktemp)"
WORK_DIR="$(mktemp -d)"
trap 'rm -f "$COOKIE_JAR"; rm -rf "$WORK_DIR"' EXIT

json_value() {
  python3 -c "import json,sys; data=json.load(sys.stdin); print(data$1)"
}

csrf() {
  curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE_URL/sanctum/csrf-cookie" >/dev/null
  XSRF_TOKEN="$(python3 - "$COOKIE_JAR" <<'PY'
import sys
from urllib.parse import unquote
for line in open(sys.argv[1]):
    if not line.startswith('#'):
        fields = line.rstrip().split('\t')
        if len(fields) >= 7 and fields[5] == 'XSRF-TOKEN':
            print(unquote(fields[6]))
            break
PY
)"
  [ -n "$XSRF_TOKEN" ] || { echo "Could not read Laravel's XSRF token." >&2; exit 1; }
}

post() {
  curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -H "X-XSRF-TOKEN: $XSRF_TOKEN" \
    -X POST "$BASE_URL$1" -d "$2"
}

put() {
  curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -H "X-XSRF-TOKEN: $XSRF_TOKEN" \
    -X PUT "$BASE_URL$1" -d "$2"
}

delete_request() {
  curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -H "Accept: application/json" \
    -H "X-XSRF-TOKEN: $XSRF_TOKEN" \
    -X DELETE "$BASE_URL$1" >/dev/null
}

echo "Waiting for the complete Field Notes stack at $BASE_URL …"
for attempt in $(seq 1 60); do
  if curl -fsS "$BASE_URL/up" >/dev/null 2>&1; then break; fi
  [ "$attempt" -lt 60 ] || { echo "Stack did not become healthy." >&2; exit 1; }
  sleep 2
done

echo "1/7 Laravel, MySQL, MinIO, public profile, and gallery"
STATUS="$(curl -fsS -H "Accept: application/json" "$BASE_URL/api/status")"
printf '%s' "$STATUS" | json_value "['database_driver']" | grep -q '^mysql$'
printf '%s' "$STATUS" | json_value "['checks']['minio']" | grep -q -E '^(True|true|1)$'
curl -fsS -H "Accept: application/json" "$BASE_URL/api/profile" | json_value "['display_name']" >/dev/null
curl -fsS -H "Accept: application/json" "$BASE_URL/api/media" | json_value "[0]['id']" >/dev/null

echo "2/7 Registering a visitor"
csrf
VISITOR_EMAIL="smoke.$(date +%s)@example.test"
post "/api/auth/register" "{\"name\":\"Smoke Test Visitor\",\"email\":\"$VISITOR_EMAIL\",\"password\":\"testing123\"}" | json_value "['user']['id']" >/dev/null

echo "3/7 Creating a conversation and writing a message"
CONVERSATION="$(post "/api/conversations" '{}')"
CONVERSATION_ID="$(printf '%s' "$CONVERSATION" | json_value "['id']")"
MESSAGE="$(post "/api/conversations/$CONVERSATION_ID/messages" '{"body":"Hello from the Docker smoke test. The Laravel API can write messages."}')"
printf '%s' "$MESSAGE" | json_value "['id']" >/dev/null
curl -fsS -b "$COOKIE_JAR" -H "Accept: application/json" "$BASE_URL/api/conversations/$CONVERSATION_ID/messages" | json_value "[-1]['body']" | grep -q "Docker smoke test"

echo "4/7 Signing in as the owner"
post "/api/auth/logout" '{}' >/dev/null
csrf
post "/api/auth/login" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | json_value "['user']['role']" | grep -q admin

echo "5/7 Reading the owner inbox and marking the message read"
curl -fsS -b "$COOKIE_JAR" -H "Accept: application/json" "$BASE_URL/api/admin/conversations" | json_value "[0]['id']" >/dev/null
post "/api/admin/conversations/$CONVERSATION_ID/read" '{}' | json_value "['unread_count']" | grep -q '^0$'

echo "6/7 Uploading a real image directly to MinIO"
python3 - "$WORK_DIR/smoke.png" <<'PY'
import base64, sys
png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
open(sys.argv[1], 'wb').write(base64.b64decode(png))
PY
SIZE="$(wc -c < "$WORK_DIR/smoke.png" | tr -d ' ')"
SIGNED="$(post "/api/admin/uploads/presign" "{\"file_name\":\"smoke.png\",\"content_type\":\"image/png\",\"size\":$SIZE}")"
UPLOAD_URL="$(printf '%s' "$SIGNED" | json_value "['upload_url']")"
PUBLIC_URL="$(printf '%s' "$SIGNED" | json_value "['public_url']")"
curl -fsS -X PUT -H "Content-Type: image/png" --data-binary "@$WORK_DIR/smoke.png" "$UPLOAD_URL" >/dev/null
curl -fsS "$PUBLIC_URL" >/dev/null

echo "7/7 Creating, updating, and deleting the uploaded media record"
MEDIA="$(post "/api/admin/media" "{\"title\":\"Docker smoke test\",\"description\":\"Temporary end-to-end test image.\",\"media_type\":\"photo\",\"category\":\"Test\",\"thumbnail_url\":\"$PUBLIC_URL\",\"media_url\":\"$PUBLIC_URL\",\"size_label\":\"$SIZE bytes\",\"aspect_ratio\":\"square\",\"captured_at\":\"2026-01-01T00:00:00Z\",\"is_favorite\":false,\"is_public\":true}")"
MEDIA_ID="$(printf '%s' "$MEDIA" | json_value "['id']")"
put "/api/admin/media/$MEDIA_ID" '{"is_public":false}' | json_value "['is_public']" | grep -q -E '^(False|false|0)$'
delete_request "/api/admin/media/$MEDIA_ID"
if curl -fsS "$PUBLIC_URL" >/dev/null 2>&1; then
  echo "MinIO object still exists after media deletion." >&2
  exit 1
fi

echo "All tests passed: frontend proxy, Sanctum auth, MySQL writes, chat, admin authorization, and MinIO uploads work together."
