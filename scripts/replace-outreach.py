#!/usr/bin/env python3
"""One-shot rewrite of the templated outreach section."""
import re
import sys
from pathlib import Path

p = Path('src/lib/outreach.ts')
src = p.read_text(encoding='utf-8')

# Find start: 'const TEMPLATES: Record<OutreachCategory, TemplateSpec> = {'
# Find end of TEMPLATED_TARGETS: the '];' before 'export const OUTREACH_TARGETS'
start_anchor = 'const TEMPLATES: Record<OutreachCategory, TemplateSpec> = {'
end_anchor = 'export const OUTREACH_TARGETS: OutreachTarget[] = ['

start = src.find(start_anchor)
end = src.find(end_anchor)
if start == -1 or end == -1:
    sys.exit(f"anchors not found start={start} end={end}")

# We want to keep everything up to start, replace with new content, then keep from end onward
prefix = src[:start]
suffix = src[end:]

new_block = open('scripts/new-outreach-block.txt', 'r', encoding='utf-8').read()
result = prefix + new_block + suffix
p.write_text(result, encoding='utf-8')
print(f"wrote {p}, deleted {end - start} bytes, inserted {len(new_block)} bytes")
