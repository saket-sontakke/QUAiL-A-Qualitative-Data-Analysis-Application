# start-all.ps1
Start-Process powershell -ArgumentList "cd frontend; npm run dev"
Start-Process powershell -ArgumentList "cd backend; npm run dev"
Start-Process powershell -ArgumentList "cd stats-microservice; .\stats-env\Scripts\Activate.ps1; python app.py"
