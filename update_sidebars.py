import os
import re
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
    "transactions.html"
]

public_dir = Path(__file__).parent / "public"
print(f"Working in: {public_dir}")

for file in files:
    filepath = public_dir / file
    if not filepath.exists():
        print(f"File not found: {filepath}")
        continue
    
    print(f"Processing {file}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Look for sidebar header close, then nav opening
    # Use a more flexible regex that handles multi-line formatting
    pattern = r'(</div>\s*)\n(\s*)<nav\s+class="sidebar-nav"'
    
    if re.search(pattern, content):
        print(f"  Found nav after header, restructuring...")
        
        # Find the sidebar-header div and wrap it
        # This is more reliable than trying to match the whole structure
        sidebar_start = content.find('<aside class="sidebar"')
        if sidebar_start == -1:
            print(f"  ERROR: Cannot find aside tag")
            continue
        
        # Find sidebar-header
        header_start = content.find('<div class="sidebar-header">', sidebar_start)
        if header_start == -1:
            print(f"  ERROR: Cannot find sidebar-header")
            continue
        
        # Find the closing tag of sidebar-header
        header_close = content.find('</div>', header_start)
        if header_close == -1:
            print(f"  ERROR: Cannot find closing div for sidebar-header")
            continue
        
        header_close += len('</div>')
        
        # Check if already wrapped
        before_header = content[max(0, header_start-50):header_start]
        if 'sidebar-top' in before_header:
            print(f"  Already restructured, skipping")
            continue
        
        # Find nav tag start
        nav_start = content.find('<nav class="sidebar-nav"', header_close)
        if nav_start == -1:
            print(f"  ERROR: Cannot find sidebar-nav")
            continue
        
        # Find nav close tag
        nav_close_idx = nav_start
        depth = 0
        i = nav_start
        while i < len(content):
            if content[i:i+4] == '<nav':
                depth += 1
            elif content[i:i+6] == '</nav>':
                depth -= 1
                if depth == 0:
                    nav_close_idx = i + 6
                    break
            i += 1
        
        if depth != 0:
            print(f"  ERROR: Cannot find proper nav close")
            continue
        
        # Find footer start
        footer_start = content.find('<div class="sidebar-footer"', nav_close_idx)
        if footer_start == -1:
            print(f"  ERROR: Cannot find sidebar-footer")
            continue
        
        # Find footer close
        footer_close = content.find('</div>', footer_start)
        if footer_close == -1:
            print(f"  ERROR: Cannot find sidebar-footer close")
            continue
        footer_close += len('</div>')
        
        # Extract the components
        header_div = content[header_start:header_close]
        nav_div = content[nav_start:nav_close_idx]
        footer_div = content[footer_start:footer_close]
        
        # Create new structure
        new_structure = f'''    <div class="sidebar-top">
      {header_div}
    </div>

    <div class="sidebar-scroll">
      {nav_div}
    </div>

    <div class="sidebar-profile">
      {footer_div}
    </div>'''
        
        # Replace old structure with new one
        old_structure = content[header_start:footer_close]
        new_content = content[:header_start] + new_structure + content[footer_close:]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"  OK: {file} updated")
    else:
        print(f"  WARNING: Could not find expected structure")

print("Done!")
