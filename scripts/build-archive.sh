#!/bin/bash
# Creates a clean deployable archive of the Astro Visitor Counter project.
# Excludes node_modules, .next, .git, db files, dev logs — only source code + Docker files.

set -euo pipefail

PROJECT_DIR="/home/z/my-project"
OUTPUT_DIR="${PROJECT_DIR}/download"
OUTPUT_FILE="${OUTPUT_DIR}/astro-counter.tar.gz"

mkdir -p "$OUTPUT_DIR"

# Files & dirs to include — explicitly listed to avoid accidentally including
# stuff like .env (which contains the sandbox's DATABASE_URL), node_modules,
# or other sandbox-only artifacts.
INCLUDE_PATHS=(
  "src"
  "prisma"
  "public"
  "scripts"
  "docs"
  "package.json"
  "bun.lock"
  "next.config.ts"
  "tsconfig.json"
  "postcss.config.mjs"
  "eslint.config.mjs"
  "components.json"
  "tailwind.config.ts"
  ".gitignore"
  "Dockerfile"
  "docker-compose.yml"
  "docker-entrypoint.sh"
  ".dockerignore"
  ".env.docker.example"
  "next-env.d.ts"
  "README.md"
)

# Build the archive from a temp staging dir
STAGING_DIR=$(mktemp -d)
trap 'rm -rf "$STAGING_DIR"' EXIT

PKG_DIR="${STAGING_DIR}/astro-counter"
mkdir -p "$PKG_DIR"

echo "[build-archive] Staging files into $PKG_DIR ..."
for rel in "${INCLUDE_PATHS[@]}"; do
  src="${PROJECT_DIR}/${rel}"
  dst="${PKG_DIR}/${rel}"
  if [ ! -e "$src" ]; then
    echo "[build-archive]   skip (missing): $rel"
    continue
  fi
  # Create the parent dir of dst so cp -r works for nested paths
  mkdir -p "$(dirname "$dst")"
  cp -r "$src" "$dst"
  echo "[build-archive]   added: $rel"
done

# Make sure the entrypoint is executable in the archive
chmod +x "${PKG_DIR}/docker-entrypoint.sh"

echo ""
echo "[build-archive] Creating tarball..."
# Create the tarball from the staging dir
tar -czf "$OUTPUT_FILE" -C "$STAGING_DIR" astro-counter

echo ""
echo "[build-archive] Done: $OUTPUT_FILE"
ls -lh "$OUTPUT_FILE"
echo ""
echo "[build-archive] Contents (top 40 entries):"
tar -tzf "$OUTPUT_FILE" | head -40
echo "..."
echo ""
echo "[build-archive] Total entries:"
tar -tzf "$OUTPUT_FILE" | wc -l
