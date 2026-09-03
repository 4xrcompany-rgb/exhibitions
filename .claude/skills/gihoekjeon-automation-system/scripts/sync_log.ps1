# 작업기록을 중앙(GitHub)으로 올린다.
# - '기록/' 폴더만 커밋한다(시스템 파일은 절대 건드리지 않음).
# - 올리기 전에 pull --rebase 로 관리자 개선분(system)을 받아온다.
#
# 두 가지 방식으로 실행된다:
#   ① 윈도우 작업 스케줄러가 30분마다 자동 실행 (설정: ➌_자동기록동기화.bat)
#   ② 수동:  powershell -ExecutionPolicy Bypass -File .claude/skills/gihoekjeon-automation-system/scripts/sync_log.ps1

$ErrorActionPreference = "Continue"

# 자동 실행 중에 비밀번호 창이 떠서 멈추는 것 방지 (자격증명 없으면 그냥 실패)
$env:GIT_TERMINAL_PROMPT = "0"

# 실행 기록 — 문제가 생기면 %TEMP%\4xr_sync.log 를 확인한다
$logPath = Join-Path $env:TEMP "4xr_sync.log"
try { Start-Transcript -Path $logPath -Append -ErrorAction Stop | Out-Null; $tr = $true } catch { $tr = $false }

try {
    # 저장소 루트로 이동 (이 스크립트 위치 기준 4단계 위)
    $root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
    Set-Location $root

    # 작업자 이름
    $who = "unknown"
    if (Test-Path "WHOAMI.txt") { $who = (Get-Content "WHOAMI.txt" -Raw).Trim() }

    $today = Get-Date -Format "yyyy-MM-dd"

    git add "★건들지마세요(시스템)/기록"
    # 스테이징된 게 있을 때만 커밋
    $staged = git diff --cached --name-only
    if ($staged) {
        git commit -m "log: $who $today"
        Write-Host "커밋함 — $($staged -join ', ')"
    }

    # ★항상 최신 규칙/개선분을 받아온다 — 작업(기록)이 없어도 새 규칙이 자동 전파된다.
    git pull --rebase --autostash
    # 올릴 게 있으면 올린다
    $ahead = git rev-list --count "@{upstream}..HEAD" 2>$null
    if ($ahead -ne "0") {
        git push
        Write-Host "$(Get-Date -Format 'HH:mm')  동기화 완료(받기+올리기) — 작업자: $who"
    } else {
        Write-Host "$(Get-Date -Format 'HH:mm')  최신 받기 완료(올릴 기록 없음)"
    }
} finally {
    if ($tr) { try { Stop-Transcript | Out-Null } catch {} }
}
