#!/usr/bin/env python3
"""Update sidebar structure in all HTML files."""

import os
import re
from pathlib import Path

files_to_update = [
    "accounts.html",
    "budgets.html",
    "categories.html",
    "dashboard.html",
    "forecast.html",
    "goals.html",
    "planned.html",
    "rules.html",
    "settings.html",
    "transactions.html",
]

already_updated = [
    "education.html",
    "premium.html",
    "recurring.html",
    "reports.html",
]

public_dir = Path(__file__).parent / "public"

def update_file(filepath):
    """Update a single HTML file."""
    print(f"Processing {filepath.name}...", end=" ")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already updated
    if 'class="sidebar-scroll"' in content:
        print("Already updated, skipping")
        return
    
    # Replace pattern: find and replace the open sidebar tag with extra wrapper
    # Pattern 1: insert sidebar-top wrapper after <aside>
    # Pattern 2: wrap nav in sidebar-scroll
    # Pattern 3: change sidebar-footer to sidebar-profile
    
    # First, check if we have the structure we expect
    if '<div class="sidebar-header">' not in content:
        print("ERROR: No sidebar-header found")
        return
    
    if '<nav class="sidebar-nav"' not in content:
        print("ERROR: No sidebar-nav found")
        return
    
    if '<div class="sidebar-footer">' not in content:
        print("ERROR: No sidebar-footer found")
        return
    
    # Step 1: Add sidebar-top wrapper after <aside ...>
    aside_pattern = r'(<aside\s+[^>]*>)\s*(<div class="sidebar-header">)'
    content = re.sub(
        aside_pattern,
        r'\1\n    <div class="sidebar-top">\n      \2',
        content,
        count=1
    )
    
    # Step 2: Close sidebar-top before nav starts
    # Find </div> before <nav class="sidebar-nav" and add closing sidebar-top
    nav_pattern = r'(</div>)\s*(<nav\s+class="sidebar-nav")'
    content = re.sub(
        nav_pattern,
        r'\1\n    </div>\n\n    <div class="sidebar-scroll">\n      \2',
        content,
        count=1
    )
    
    # Step 3: Close sidebar-scroll before sidebar-footer
    footer_pattern = r'(</nav>)\s*(<div class="sidebar-footer">)'
    content = re.sub(
        footer_pattern,
        r'\1\n    </div>\n\n    <div class="sidebar-profile">\n      \2',
        content,
        count=1
    )
    
    # Step 4: Change sidebar-footer to sidebar-profile close (optional, keep as is for now)
    # The footer content stays as-is inside sidebar-profile
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓ Updated")

print(f"Working in: {public_dir}\n")

# Update files that need updating
for fname in files_to_update:
    fpath = public_dir / fname
    if fpath.exists():
        update_file(fpath)
    else:
        print(f"File not found: {fname}")

# Check already updated files
print("\nAlready updated files:")
for fname in already_updated:
    fpath = public_dir / fname
    if fpath.exists():
        print(f"  ✓ {fname}")
    else:
        print(f"  ? {fname} not found")

print("\nDone!")
