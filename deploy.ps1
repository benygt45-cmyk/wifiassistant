# Ayrilmaz Bot - One-Click Deploy (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AYRILMAZ BOT - 7/24 WEB HOSTING DEPLOY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Git check
Write-Host "[1/5] Git kontrol ediliyor..." -ForegroundColor Yellow
try { git --version | Out-Null } catch { Write-Host "GIT YOK! https://git-scm.com/download/win" -ForegroundColor Red; Read-Host "Enter"; exit 1 }
Write-Host "Git OK." -ForegroundColor Green

# 2. Railway CLI
Write-Host "[2/5] Railway CLI kontrol ediliyor..." -ForegroundColor Yellow
try { railway --version | Out-Null } catch {
    Write-Host "Railway CLI kuruluyor..." -ForegroundColor Yellow
    npm i -g @railway/cli 2>&1 | Where-Object { $_ -notmatch "npm WARN" }
    if ($LASTEXITCODE) { Write-Host "NPM yok. Node.js kurun: https://nodejs.org" -ForegroundColor Red; Read-Host "Enter"; exit 1 }
}
Write-Host "Railway CLI OK." -ForegroundColor Green

# 3. Login
Write-Host "[3/5] Railway login..." -ForegroundColor Yellow
Write-Host "Tarayıcı açılacak -> GitHub/Google ile giriş yapın." -ForegroundColor Gray
railway login
if ($LASTEXITCODE) { Write-Host "Login başarısız." -ForegroundColor Red; Read-Host "Enter"; exit 1 }

# 4. Init
Write-Host "[4/5] Proje init..." -ForegroundColor Yellow
railway init --name ayrilmaz-bot 2>&1 | Where-Object { $_ -notmatch "^\s*$" }
if ($LASTEXITCODE) { Write-Host "Init başarısız." -ForegroundColor Red; Read-Host "Enter"; exit 1 }

# 5. Deploy
Write-Host "[5/5] DEPLOY EDILIYOR..." -ForegroundColor Yellow
Write-Host "Bu 1-2 dakika sürebilir..." -ForegroundColor Gray
railway up --detach
if ($LASTEXITCODE) { Write-Host "Deploy başarısız. Loglar: railway logs" -ForegroundColor Red; Read-Host "Enter"; exit 1 }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY TAMAMLANDI!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Domaininiz için:" -ForegroundColor Yellow
railway domain
Write-Host ""
Write-Host "7/24 için UptimeRobot ekleyin:" -ForegroundColor Yellow
Write-Host "https://uptimerobot.com -> New Monitor"
Write-Host "URL: https://xxx.up.railway.app/health"
Write-Host "Interval: 5 minutes"
Write-Host ""
Read-Host "Enter ile çık"