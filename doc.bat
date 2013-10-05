@echo off
CLS
echo Hello ;). You use windows, and hell wait you!!!
set SEARCH_DIR=%~f1
if "%SEARCH_DIR%"=="" (
  echo.
  echo Wrong parameters 
  echo.
  echo Usage: "doc /path/to/sources"
  exit /b 0
)
node doc.js %SEARCH_DIR%
exit /b 0