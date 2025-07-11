@echo off
echo Building FusionX installer...
call npm install
call npm run build
echo Build complete! Check the 'dist' folder for the installer.
