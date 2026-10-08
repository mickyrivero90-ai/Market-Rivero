@echo off
rem Abre el programa de folletos de Rivero Market (Windows). Hace falta tener Python 3 instalado.
cd /d "%~dp0"
where pyw >nul 2>nul && (start "" pyw -3 "programa\servidor.py" --abrir & exit /b)
where pythonw >nul 2>nul && (start "" pythonw "programa\servidor.py" --abrir & exit /b)
python --version >nul 2>nul && (start "" /min python "programa\servidor.py" --abrir & exit /b)
echo.
echo  No encuentro Python en esta computadora.
echo  1) Entra a https://www.python.org/downloads/ y descarga Python (es gratis).
echo  2) Al instalar, tilda la casilla "Add python.exe to PATH".
echo  3) Volve a abrir este archivo.
echo.
pause
