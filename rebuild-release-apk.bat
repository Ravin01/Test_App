@echo off
echo ========================================
echo FLYKUP Release APK Build Script
echo ========================================
echo.

echo Step 1: Cleaning previous builds...
cd android
call gradlew clean
if %errorlevel% neq 0 (
    echo ERROR: Clean failed!
    pause
    exit /b %errorlevel%
)
echo ✓ Clean completed
echo.

echo Step 2: Building Release APK...
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b %errorlevel%
)
echo ✓ Build completed
echo.

echo ========================================
echo Build Successful!
echo ========================================
echo.
echo APK Location:
echo android\app\build\outputs\apk\release\
echo.
echo Available APKs:
dir /b app\build\outputs\apk\release\*.apk 2>nul
echo.
echo For arm64-v8a device, use:
echo app-arm64-v8a-release.apk
echo.
echo ========================================
echo Installation Instructions:
echo ========================================
echo.
echo Option 1 - Via ADB:
echo   adb install app\build\outputs\apk\release\app-arm64-v8a-release.apk
echo.
echo Option 2 - Manual:
echo   1. Copy APK to device
echo   2. Enable "Install from Unknown Sources"
echo   3. Open and install the APK
echo.
pause
