@echo off
echo ========================================
echo FLYKUP App Launch Speed Optimization
echo ========================================
echo.
echo This script will apply performance optimizations to your app.
echo.
echo IMPORTANT: This will backup your current files first.
echo.
pause

echo.
echo [1/5] Creating backups...
copy index.js index.js.backup
copy App.tsx App.tsx.backup
copy android\app\build.gradle android\app\build.gradle.backup
echo ✓ Backups created

echo.
echo [2/5] Applying optimized files...
copy /Y index.optimized.js index.js
copy /Y App.optimized.tsx App.tsx
echo ✓ Optimized files applied

echo.
echo [3/5] Cleaning Android build cache...
cd android
call gradlew.bat clean
cd ..
echo ✓ Android cache cleaned

echo.
echo [4/5] Clearing Metro bundler cache...
echo Run: npm start -- --reset-cache
echo (You'll need to do this manually in a new terminal)

echo.
echo [5/5] Next steps:
echo ========================================
echo 1. Clear Metro cache: npm start -- --reset-cache
echo 2. Rebuild app: npm run android
echo 3. Test launch time
echo 4. Check PERFORMANCE_OPTIMIZATION_GUIDE.md for details
echo.
echo Expected improvement: 50-60%% faster cold start
echo ========================================
echo.
echo Optimization complete! 🚀
echo.
echo To rollback if needed:
echo   copy index.js.backup index.js
echo   copy App.tsx.backup App.tsx
echo   copy android\app\build.gradle.backup android\app\build.gradle
echo.
pause
