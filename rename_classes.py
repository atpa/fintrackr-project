#!/usr/bin/env python3
"""Replace sidebar-profile with sidebar-bottom in all HTML files."""

from pathlib import Path

files = [
    "accounts.html",
    "budgets.html",
    "categories.html",
    "dashboard.html",
    "education.html",
    "forecast.html",
    "goals.html",
    "planned.html",
    "premium.html",
    "recurring.html",
    "reports.html",
    "rules.html",
    "settings.html",
    "transactions.html",
]

public_dir = Path(__file__).parent / "public"

for fname in files:
    fpath = public_dir / fname
    if not fpath.exists():
        print(f"⚠ {fname} not found")
        continue
    
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'sidebar-profile' not in content:
        print(f"⏭ {fname}: no sidebar-profile found")
        continue
    
    # Replace sidebar-profile with sidebar-bottom
    new_content = content.replace('class="sidebar-profile"', 'class="sidebar-bottom"')
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✓ {fname}: updated")

print("\nDone!")
