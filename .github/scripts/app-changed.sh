#!/usr/bin/env bash
# Prints "true" if the changes between two commits can affect the app or its build
# (source/, the build workflow, the Gradle signing script), else "false".
# Usage: app-changed.sh [<base> <head>]   (default: HEAD^ HEAD)
set -euo pipefail
base=${1:-HEAD^}
head=${2:-HEAD}
if git diff --quiet "$base" "$head" -- source .github/workflows/build-android.yml .github/gradle .github/scripts/app-changed.sh; then
  echo false
else
  echo true
fi
