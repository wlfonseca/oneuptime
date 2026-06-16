#!/usr/bin/env bash
# Tests that SKIP_DOCKERHUB=true removes Docker Hub tags from build and merge scripts.
set -uo pipefail

PASS=0
FAIL=0
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

assert_contains() {
  local label="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -qF -- "$needle"; then
    PASS=$((PASS+1)); echo "  ✅ $label"
  else
    FAIL=$((FAIL+1)); echo "  ❌ $label — expected: $needle"
  fi
}

assert_not_contains() {
  local label="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -qF -- "$needle"; then
    FAIL=$((FAIL+1)); echo "  ❌ $label — should NOT contain: $needle"
  else
    PASS=$((PASS+1)); echo "  ✅ $label"
  fi
}

# Create fake docker binary
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT
cat > "$TMPDIR/docker" <<'FAKE'
#!/usr/bin/env bash
echo "DOCKER_CALL: $@"
exit 0
FAKE
chmod +x "$TMPDIR/docker"

run_build() {
  env PATH="$TMPDIR:$PATH" SKIP_DOCKERHUB="${1:-}" \
    bash "$SCRIPT_DIR/build_docker_images.sh" \
      --image app --version "10.5.0" --dockerfile ./App/Dockerfile \
      --platforms linux/amd64 --git-sha abc123 \
      --extra-tags release --extra-enterprise-tags enterprise-release 2>&1
}

run_merge() {
  env PATH="$TMPDIR:$PATH" SKIP_DOCKERHUB="${1:-}" \
    bash "$SCRIPT_DIR/merge_docker_manifests.sh" \
      --image app --tags "10.5.0,enterprise-10.5.0" 2>&1
}

# === build_docker_images.sh ===
echo "=== build_docker_images.sh ==="

echo ""
echo "-- SKIP_DOCKERHUB=true --"
OUTPUT="$(run_build true)"

# Use "--tag oneuptime/" to distinguish from "ghcr.io/oneuptime/"
assert_contains     "GHCR version tag"            "$OUTPUT" "--tag ghcr.io/oneuptime/app:10.5.0-amd64"
assert_not_contains "No Docker Hub version tag"    "$OUTPUT" "--tag oneuptime/app:10.5.0-amd64"
assert_contains     "GHCR extra tag"              "$OUTPUT" "--tag ghcr.io/oneuptime/app:release-amd64"
assert_not_contains "No Docker Hub extra tag"      "$OUTPUT" "--tag oneuptime/app:release-amd64"
assert_contains     "GHCR enterprise tag"         "$OUTPUT" "--tag ghcr.io/oneuptime/app:enterprise-10.5.0-amd64"
assert_not_contains "No Docker Hub enterprise tag" "$OUTPUT" "--tag oneuptime/app:enterprise-10.5.0-amd64"

echo ""
echo "-- SKIP_DOCKERHUB unset --"
OUTPUT="$(run_build "")"

assert_contains "GHCR version tag"        "$OUTPUT" "--tag ghcr.io/oneuptime/app:10.5.0-amd64"
assert_contains "Docker Hub version tag"   "$OUTPUT" "--tag oneuptime/app:10.5.0-amd64"
assert_contains "GHCR extra tag"          "$OUTPUT" "--tag ghcr.io/oneuptime/app:release-amd64"
assert_contains "Docker Hub extra tag"     "$OUTPUT" "--tag oneuptime/app:release-amd64"

# === merge_docker_manifests.sh ===
echo ""
echo "=== merge_docker_manifests.sh ==="

echo ""
echo "-- SKIP_DOCKERHUB=true --"
OUTPUT="$(run_merge true)"

assert_contains     "GHCR manifest tag"         "$OUTPUT" "--tag ghcr.io/oneuptime/app:10.5.0"
assert_not_contains "No Docker Hub manifest tag" "$OUTPUT" "--tag oneuptime/app:10.5.0"

echo ""
echo "-- SKIP_DOCKERHUB unset --"
OUTPUT="$(run_merge "")"

assert_contains "GHCR manifest tag"       "$OUTPUT" "--tag ghcr.io/oneuptime/app:10.5.0"
assert_contains "Docker Hub manifest tag"  "$OUTPUT" "--tag oneuptime/app:10.5.0"

# Results
echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
if [ $FAIL -gt 0 ]; then
  exit 1
fi
echo "All tests passed! ✅"
