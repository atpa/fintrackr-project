#!/usr/bin/env python3
"""Update sidebar-bottom structure in all HTML files."""

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
    
    # Replace the old nested structure with new simplified one
    # Pattern to match the old structure
    old_pattern = r'<div class="sidebar-bottom">\s*<div class="sidebar-footer">\s*<div class="profile-section">(.*?)</div>\s*<div class="sidebar-auth">(.*?)</div>\s*</div>\s*</div>'
    
    new_structure = r'''<div class="sidebar-bottom">
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
    
    if re.search(old_pattern, content, re.DOTALL):
        new_content = re.sub(old_pattern, new_structure, content, flags=re.DOTALL)
        
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✓ {fname}: updated structure")
    else:
        print(f"⚠ {fname}: pattern not matched")

print("\nDone!")
