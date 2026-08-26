@echo off
title Ayrilmaz Bot - One-Click Deploy
echo ========================================
echo  AYRILMAZ BOT - 7/24 WEB HOSTING DEPLOY
echo ========================================
echo.
echo Bu script sizi adim adim gidecek.
echo Sadece Enter'a basip talimatlari izleyin.
echo.
pause

echo.
echo [1/5] Git kontrol ediliyor...
git --version >nul 2>&1
if errorlevel 1 (
    echo GIT YOK! https://git-scm.com/download/win indirip kurun.
    pause
    exit /b 1
)
echo Git OK.

echo.
echo [2/5] Railway CLI kontrol ediliyor...
railway --version >nul 2>&1
if errorlevel 1 (
    echo Railway CLI yok. Kuruluyor...
    npm i -g @railway/cli 2>&1 | findstr /v "npm WARN"
    if errorlevel 1 (
        echo NPM yok. Node.js kurun: https://nodejs.org
        pause
        exit /b 1
    )
)
echo Railway CLI OK.

echo.
echo [3/5] Railway login...
echo Tarayici acilacak -> GitHub/Google ile giris yapin.
railway login
if errorlevel 1 (
    echo Login basarisiz.
    pause
    exit /b 1
)

echo.
echo [4/5] Proje init...
railway init --name ayrilmaz-bot 2>&1 | findstr /v "^$"
if errorlevel 1 (
    echo Init basarisiz.
    pause
    exit /b 1
)

echo.
echo [5/5] DEPLOY EDILIYOR...
echo Bu 1-2 dakika surebilir...
railway up --detach
if errorlevel 1 (
    echo Deploy basarisiz. Loglari kontrol edin: railway logs
    pause
    exit /b 1
)

echo.
echo ========================================
echo  DEPLOY TAMAMLANDI!
echo ========================================
echo.
echo Domaininiz icin:
railway domain
echo.
echo 7/24 icin UptimeRobot ekleyin:
echo https://uptimerobot.com -> New Monitor
echo URL: https://xxx.up.railway.app/health
echo Interval: 5 minutes
echo.
pause