@echo off
echo Seeding dummy data to MongoDB...
cd /d "%~dp0"
node src/scripts/seedData.js
pause