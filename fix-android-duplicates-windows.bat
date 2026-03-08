@echo off
echo 🔧 Fixing Android Duplicate Resource Issues...
echo.

REM Navigate to the project root
cd /d "%~dp0"

REM Check if the duplicate file exists and remove it
if exist "android\app\src\main\res\values\colors_responsive.xml" (
    echo 📁 Removing duplicate colors_responsive.xml file...
    del "android\app\src\main\res\values\colors_responsive.xml"
    echo ✅ Removed colors_responsive.xml
    echo.
) else (
    echo ℹ️ colors_responsive.xml not found (already removed)
    echo.
)

REM Clean Android build
echo 🧹 Cleaning Android build...
cd android
if exist "gradlew.bat" (
    call gradlew.bat clean
) else (
    echo ⚠️ gradlew.bat not found. Please run 'gradlew clean' manually.
)
cd ..

echo.
echo 🎉 Android resource conflicts should now be fixed!
echo.
echo 📋 Next steps:
echo 1. Run: npm install
echo 2. Run: npx react-native start --reset-cache
echo 3. Run: npx react-native run-android
echo.
pause