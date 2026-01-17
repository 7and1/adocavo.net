#!/bin/bash

echo "=== Blog Bundle Analysis ==="
echo ""
echo "Building with bundle analyzer..."
ANALYZE=true npm run build

echo ""
echo "Bundle sizes:"
du -sh .next/static/chunks/*.js 2>/dev/null | sort -h | tail -10

echo ""
echo "Total chunks:"
ls -1 .next/static/chunks/*.js 2>/dev/null | wc -l

echo ""
echo "Blog-specific files:"
find .next -name "*blog*" -o -name "*markdown*" -o -name "*remark*" 2>/dev/null | head -10
