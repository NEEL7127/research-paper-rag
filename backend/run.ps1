$python = Join-Path $PSScriptRoot "venv\Scripts\python.exe"
& $python -m uvicorn main:app --reload
