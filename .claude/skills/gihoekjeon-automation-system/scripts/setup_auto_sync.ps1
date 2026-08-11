# 4XR 기획전 — 작업기록 자동 동기화 설정 (컴퓨터마다 최초 1회)
#
#   ① 윈도우 작업 스케줄러에 30분마다 자동 동기화 등록
#      → 옵시디언·클로드를 안 켜도, 컴퓨터만 켜져 있으면 알아서 올라간다.
#   ② 옵시디언 Git 플러그인의 자동 동기화도 함께 켠다 (이중 안전장치)
#   ③ 지금 한 번 동기화해서 실제로 되는지 확인
#
# 사용: _처음설치_한번만\➌_자동기록동기화.bat 더블클릭

$ErrorActionPreference = "Continue"

$TaskName = "4XR_기획전_기록동기화"
$Minutes  = 30

# 저장소 루트 (이 스크립트 위치 기준 4단계 위)
$root       = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$syncScript = Join-Path $PSScriptRoot "sync_log.ps1"

Write-Host ""
Write-Host "  ═══ 4XR 작업기록 자동 동기화 설정 ═══" -ForegroundColor Cyan
Write-Host "  저장소 : $root"
Write-Host "  주기   : $Minutes 분마다"
Write-Host ""

if (-not (Test-Path $syncScript)) {
    Write-Host "  [실패] sync_log.ps1 을 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "         $syncScript"
    exit 1
}

# ── ① 윈도우 작업 스케줄러 등록 ────────────────────────────────
Write-Host "  [1/3] 윈도우 작업 스케줄러에 등록 중..."
try {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument ("-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"{0}`"" -f $syncScript)

    $tRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
        -RepetitionInterval (New-TimeSpan -Minutes $Minutes)
    $tLogon  = New-ScheduledTaskTrigger -AtLogOn

    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
        -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

    Register-ScheduledTask -TaskName $TaskName -Action $action `
        -Trigger @($tRepeat, $tLogon) -Settings $settings `
        -Description "4XR 기획전 작업기록을 회사 GitHub 으로 자동 동기화" -Force | Out-Null

    Write-Host "        완료 — 작업 이름: $TaskName" -ForegroundColor Green
} catch {
    Write-Host "        [실패] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "        이 파일을 마우스 오른쪽 → '관리자 권한으로 실행' 해 보세요." -ForegroundColor Yellow
}

# ── ② 옵시디언 Git 자동 동기화 켜기 ────────────────────────────
Write-Host "  [2/3] 옵시디언 Git 자동 동기화 켜는 중..."
$ogPath = Join-Path $root ".obsidian\plugins\obsidian-git\data.json"
if (Test-Path $ogPath) {
    try {
        $cfg = Get-Content $ogPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $cfg.autoSaveInterval          = $Minutes   # N분마다 commit + push
        $cfg.autoBackupAfterFileChange = $true      # 바뀐 게 있을 때만 동작
        $cfg.autoPullOnBoot            = $true      # 켤 때 회사 최신분 받기
        $cfg.disablePopupsForNoChanges = $true      # 조용히
        $json = $cfg | ConvertTo-Json -Depth 20
        # BOM 없이 저장 (BOM 있으면 옵시디언이 설정을 못 읽는다)
        [System.IO.File]::WriteAllText($ogPath, $json, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "        완료 — 옵시디언을 껐다 켜면 적용됩니다." -ForegroundColor Green
    } catch {
        Write-Host "        [건너뜀] $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "        [건너뜀] 옵시디언 Git 플러그인이 없습니다. (스케줄러만으로 충분합니다)" -ForegroundColor Yellow
}

# ── ③ 지금 한 번 동기화해서 확인 ───────────────────────────────
Write-Host "  [3/3] 지금 한 번 동기화해 봅니다..."
Write-Host ""
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $syncScript
Write-Host ""

Write-Host "  ═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  설정 끝! 이제 작업기록은 자동으로 올라갑니다." -ForegroundColor Green
Write-Host "  더 이상 GitHub Desktop 을 열 필요 없습니다."
Write-Host ""
Write-Host "  · 잘 안 되는 것 같으면 → %TEMP%\4xr_sync.log 확인"
Write-Host "  · 자동 동기화를 끄려면 → ➍_자동동기화_해제.bat"
Write-Host ""
