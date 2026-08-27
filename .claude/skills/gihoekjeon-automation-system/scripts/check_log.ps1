# 4XR 새 작업자 "기록이 안 올라옴" 원인 점검 (읽기 + 수동 동기화 1회)
$ErrorActionPreference = "SilentlyContinue"
$report = Join-Path ([Environment]::GetFolderPath('Desktop')) '4XR_기록점검.txt'
function Log($m){ $m | Out-File -FilePath $report -Append -Encoding utf8 }
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm')] 4XR 기록 점검" | Out-File -FilePath $report -Encoding utf8
Log ""

$dest = Join-Path $env:USERPROFILE 'Documents\4XR_기획전'
if (-not (Test-Path (Join-Path $dest '.git'))) {
    Log "[X] 작업자 저장소가 없습니다: $dest"
    Log "    -> 4XR_시작.bat 을 먼저 실행하세요."
    Start-Process notepad.exe $report; exit
}
Set-Location -LiteralPath $dest

# 1) 이름
if (Test-Path 'WHOAMI.txt') { $who = (Get-Content 'WHOAMI.txt' -Raw).Trim() } else { $who = '(WHOAMI.txt 없음!)' }
Log "작업자 이름(WHOAMI): $who"

# 2) 기록 파일 존재?
Log ""
Log "-- 기록 폴더 안 .md 파일 --"
$recs = Get-ChildItem "★건들지마세요(시스템)\기록" -Recurse -Filter *.md -File | Where-Object { $_.Name -ne 'README.md' }
if ($recs) { $recs | ForEach-Object { Log ("  " + $_.FullName.Replace($dest,'')) } }
else { Log "  [!] 기록 .md 가 하나도 없음 -> 이 PC에서 '작업기록이 작성되지 않았다'는 뜻(원인1)." }

# 3) git 상태
Log ""
Log "-- git 상태(안 올라간 것) --"
$st = git status --short --untracked-files=all
if ($st) { Log ($st -join "`n") } else { Log "  (변경 없음)" }
$ahead = git rev-list --count "@{upstream}..HEAD" 2>$null
Log "  안 올라간 커밋 수(ahead): $ahead"

# 4) 예약작업
Log ""
Log "-- 동기화 예약작업 --"
$t = Get-ScheduledTask -TaskName '4XR_기획전_기록동기화' -ErrorAction SilentlyContinue
if ($t) {
    $info = $t | Get-ScheduledTaskInfo
    Log "  있음 · 마지막실행 $($info.LastRunTime) · 결과코드 $($info.LastTaskResult)"
    Log ("  실행줄: " + (($t.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)" }) -join ' '))
} else { Log "  [X] 예약작업 없음 -> 4XR_시작.bat 재실행 필요(원인3)." }

# 5) 동기화 로그 끝부분
Log ""
Log "-- 최근 동기화 로그(끝 25줄) --"
$lg = Join-Path $env:TEMP '4xr_sync.log'
if (Test-Path $lg) { Get-Content $lg -Tail 25 | ForEach-Object { Log "  $_" } }
else { Log "  (로그 없음 - 아직 한 번도 안 돌았을 수 있음)" }

# 6) 지금 수동 동기화 1회 (push 인증 문제면 여기서 에러가 찍힘)
Log ""
Log "-- 지금 수동 동기화 시도 --"
$sync = "$dest\.claude\skills\gihoekjeon-automation-system\scripts\sync_log.ps1"
if (Test-Path $sync) {
    $out = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $sync 2>&1
    Log ($out -join "`n")
} else { Log "  sync_log.ps1 없음" }

Log ""
"[$(Get-Date -Format 'HH:mm')] 점검 끝 - 이 파일(4XR_기록점검.txt)을 관리자에게 보내주세요." | Out-File -FilePath $report -Append -Encoding utf8
Start-Process notepad.exe $report
