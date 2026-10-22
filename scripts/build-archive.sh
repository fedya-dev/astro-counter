#!/bin/bash
set -euo pipefail

PROJECT_DIR="/home/z/my-project"
OUTPUT_DIR="${PROJECT_DIR}/download"
OUTPUT_FILE="${OUTPUT_DIR}/astro-counter.tar.gz"

mkdir -p "$OUTPUT_DIR"

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
  mkdir -p "$(dirname "$dst")"
  cp -r "$src" "$dst"
  echo "[build-archive]   added: $rel"
done

chmod +x "${PKG_DIR}/docker-entrypoint.sh"

echo ""
echo "[build-archive] Creating tarball..."
tar -czf "$OUTPUT_FILE" -C "$STAGING_DIR" astro-counter

echo ""
echo "[build-archive] Done: $OUTPUT_FILE"
ls -lh "$OUTPUT_FILE"
echo ""
echo "[build-archive] Total entries:"
tar -tzf "$OUTPUT_FILE" | wc -l
