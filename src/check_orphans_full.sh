#!/bin/bash

# Get all files in focus areas, excluding index files
for file in $(find domains features pages -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | sort); do
  file_without_ext="${file%.*}"
  base=$(basename "$file_without_ext")
  
  # Skip index files - those are re-exports and should be checked via their parent dirs
  if [ "$base" = "index" ]; then
    continue
  fi
  
  # For this file, check if it's imported anywhere
  # Convert the path to potential import reference format
  # e.g., domains/ops/admin/AdminPage.tsx could be imported as:
  # - domains/ops/admin/AdminPage
  # - ../../../domains/ops/admin/AdminPage (from other locations)
  # - ../../domains/ops/admin/AdminPage (from other locations)
  
  # Simple approach: search for the filename without extension
  if ! grep -r "from.*['\"].*${file_without_ext}['\"]" . --include="*.ts" --include="*.tsx" >/dev/null 2>&1; then
    # Also try without the path, in case it's imported via barrel export
    if ! grep -r "$base" . --include="*.ts" --include="*.tsx" >/dev/null 2>&1; then
      echo "$file"
    fi
  fi
done

