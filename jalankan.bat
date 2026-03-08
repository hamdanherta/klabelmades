@echo off
title Labeling Tool Runner
echo 🎨 Menjalankan Labeling Tool Web Version...

:: Menjalankan Laravel di jendela baru
start cmd /k "echo 🚀 Menjalankan Backend (Laravel)... && php artisan serve"

:: Menjalankan Vite di jendela baru
start cmd /k "echo ⚡ Menjalankan Frontend (Vite)... && npm run dev"

echo.
echo ======================================================
echo ✅ Kedua server sedang diproses untuk dijalankan!
echo 🌐 Akses aplikasi di: http://localhost:8000
echo ======================================================
echo.
pause
