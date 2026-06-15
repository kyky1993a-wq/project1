# 서버에 파일 업로드 스크립트
# 사용법: .\server\upload.ps1 -KeyFile "키파일.key" -ServerIP "123.456.789.0"

param(
    [Parameter(Mandatory=$true)]
    [string]$KeyFile,

    [Parameter(Mandatory=$true)]
    [string]$ServerIP
)

$AppDir = Split-Path -Parent $PSScriptRoot
$Remote = "ubuntu@${ServerIP}:/home/ubuntu/diary-app"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  서버에 파일 업로드 중..." -ForegroundColor Cyan
Write-Host "  대상: $ServerIP" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# scp로 전체 업로드 (node_modules, venv, __pycache__ 제외)
# rsync가 있으면 더 빠름
$excludes = @("node_modules", "venv", "__pycache__", ".git", "*.pyc", "dist")

Write-Host "`n[1/2] 파일 업로드 중 (node_modules 제외)..." -ForegroundColor Yellow

# 임시 제외 목록 파일 생성
$excludeFile = [System.IO.Path]::GetTempFileName()
$excludes | Out-File $excludeFile -Encoding utf8

# rsync 사용 (WSL 또는 Git Bash 필요)
# rsync -avz --exclude-from=$excludeFile -e "ssh -i $KeyFile" $AppDir/ $Remote/

# scp 사용 (기본 Windows)
scp -i $KeyFile -r $AppDir ubuntu@${ServerIP}:/home/ubuntu/
if ($LASTEXITCODE -ne 0) {
    Write-Host "업로드 실패. SSH 키와 IP를 확인해주세요." -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/2] 배포 스크립트 실행..." -ForegroundColor Yellow
ssh -i $KeyFile ubuntu@$ServerIP "chmod +x /home/ubuntu/diary-app/server/deploy.sh && /home/ubuntu/diary-app/server/deploy.sh"

Write-Host "`n======================================"  -ForegroundColor Green
Write-Host "  완료! http://$ServerIP 에서 확인하세요" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
