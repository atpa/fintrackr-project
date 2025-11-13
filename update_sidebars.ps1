$files = @(
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
)

$publicDir = Join-Path $PSScriptRoot "public"
Write-Host "Working in: $publicDir"

foreach ($file in $files) {
    $filePath = Join-Path $publicDir $file
    if (-not (Test-Path $filePath)) {
        Write-Host "File not found: $filePath"
        continue
    }
    
    Write-Host "Processing $file..."
    
    $content = Get-Content -Path $filePath -Raw -Encoding UTF8
    
    $pattern = '(?s)(<aside class="sidebar"[^>]*>)\s*(<div class="sidebar-header">.*?</div>)\s*(<nav class="sidebar-nav"[^>]*>.*?</nav>)\s*(<div class="sidebar-footer">.*?</div>)\s*(</aside>)'
    
    if ($content -match $pattern) {
        Write-Host "  Found sidebar structure, restructuring..."
        
        $aside = $matches[1]
        $header = $matches[2]
        $nav = $matches[3]
        $footer = $matches[4]
        $closeAside = $matches[5]
        
        $newStructure = @"
$aside
    <div class="sidebar-top">
      $header
    </div>

    <div class="sidebar-scroll">
      $nav
    </div>

    <div class="sidebar-profile">
      $footer
    </div>
  $closeAside
"@
        
        $content = $content -replace [regex]::Escape($matches[0]), $newStructure
        
        Set-Content -Path $filePath -Value $content -Encoding UTF8
        Write-Host "  OK: $file updated"
    } else {
        Write-Host "  WARNING: Could not find sidebar structure in $file"
    }
}

Write-Host "Done!"
