#!/usr/bin/env python3
"""Update sidebar-bottom structure - more flexible approach."""

from pathlib import Path
import re

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
    
    if 'sidebar-bottom' not in content:
        print(f"⏭ {fname}: no sidebar-bottom")
        continue
    
    # More flexible pattern
    pattern = r'<div class="sidebar-bottom">[^<]*(?:<div[^>]*>.*?</div>\s*)*<div class="sidebar-footer">.*?</div>\s*</div>\s*</div>'
    
    if not re.search(pattern, content, re.DOTALL):
        print(f"⚠ {fname}: pattern not matched, trying different approach")
        
        # Alternative: just clean up the nesting
        # Replace sidebar-footer with its parent's class
        if '<div class="sidebar-footer">' in content:
            content = content.replace(
                '<div class="sidebar-footer">\n        <div class="profile-section">',
                '<div class="profile-section">'
            )
            content = content.replace(
                '        </div>\n      </div>',
                '        </div>'
            )
            
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ {fname}: cleaned nested structure")
        continue
    
    # Replace using the pattern
    new_structure = '''<div class="sidebar-bottom">
      <div class="profile-section">
        <div class="user-info">
          <div class="user-avatar">👤</div>
          <div class="user-meta">
            <span class="user-name">Пользователь</span>
            <span class="user-email">user@example.com</span>
          </div>
        </div>
      </div>

      <div class="sidebar-auth">
        <a href="login.html" class="auth-link login-link" style="display: block">Вход</a>
        <a href="register.html" class="auth-link register-link" style="display: block">Регистрация</a>
        <a href="#" class="auth-link logout-link" style="display: none">Выход</a>
      </div>
    </div>'''
    
    new_content = re.sub(pattern, new_structure, content, flags=re.DOTALL)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✓ {fname}: updated")

print("\nDone!")
