# 작업기록을 중앙(GitHub)으로 올린다.
# - '기록/' 폴더만 커밋한다(시스템 파일은 절대 건드리지 않음).
# - 올리기 전에 최신(관리자 개선분/system)을 받아온다 — merge 방식.
#
# 두 가지 방식으로 실행된다:
#   ① 윈도우 작업 스케줄러가 30분마다 자동 실행 (설정: ➌_자동기록동기화.bat)
#   ② 수동:  powershell -ExecutionPolicy Bypass -File .claude/skills/gihoekjeon-automation-system/scripts/sync_log.ps1
#
# ★2026-09-16 개선(허숙현 09-07 사고): pull --rebase 가 이 저장소에서 재현성 있게 멈춰
#   detached HEAD 로 8일간 조용히 '올리기 실패'만 반복했다. → (1) 멈춘 rebase/merge 를
#   매 실행 첫머리에 감지해 자동 복구하고, (2) 받기를 rebase 가 아니라 merge 로 한다.

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

    # ★0) 멈춘 병합 상태 자동 복구 — 이게 없으면 한 번 멈춘 뒤로 계속 조용히 실패한다.
    $gitDir = (git rev-parse --git-dir 2>$null)
    if (-not $gitDir) { $gitDir = ".git" }
    if ((Test-Path (Join-Path $gitDir "rebase-merge")) -or (Test-Path (Join-Path $gitDir "rebase-apply"))) {
        git rebase --abort 2>&1 | Out-Null
        Write-Host "$(Get-Date -Format 'HH:mm')  [복구] 멈춰 있던 rebase 를 중단했습니다(자동 복구)."
    }
    if (Test-Path (Join-Path $gitDir "MERGE_HEAD")) {
        git merge --abort 2>&1 | Out-Null
        Write-Host "$(Get-Date -Format 'HH:mm')  [복구] 멈춰 있던 merge 를 중단했습니다(자동 복구)."
    }
    # detached HEAD 면 main 으로 되돌린다(멈춘 rebase 흔적)
    $branch = (git rev-parse --abbrev-ref HEAD 2>$null)
    if ($branch -eq "HEAD") {
        git checkout main 2>&1 | Out-Null
        Write-Host "$(Get-Date -Format 'HH:mm')  [복구] detached HEAD → main 으로 전환."
    }

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
    #   rebase 는 이 저장소에서 멈추는 현상이 있어 쓰지 않는다. merge + autostash 로 받는다.
    git pull --no-rebase --no-edit --autostash 2>&1 | Out-Null
    $pullExit = $LASTEXITCODE
    if ($pullExit -ne 0) {
        # merge 가 충돌 등으로 실패하면, 멈춘 상태로 남기지 말고 중단해서 다음 주기가 계속 돌게 한다.
        if (Test-Path (Join-Path $gitDir "MERGE_HEAD")) { git merge --abort 2>&1 | Out-Null }
        Write-Host "$(Get-Date -Format 'HH:mm')  [받기 실패] 병합 충돌로 추정 — 관리자 확인 필요(내 기록은 커밋됨, 다음 주기 재시도)."
    }

    # 올릴 게 있으면 올린다
    $ahead = git rev-list --count "@{upstream}..HEAD" 2>$null
    if ($ahead -and $ahead -ne "0") {
        $pushOut = (git push 2>&1) -join " "
        if ($LASTEXITCODE -eq 0) {
            Write-Host "$(Get-Date -Format 'HH:mm')  올리기 성공 — 작업자: $who"
        } else {
            Write-Host "$(Get-Date -Format 'HH:mm')  [올리기 실패] $pushOut"
        }
    } else {
        Write-Host "$(Get-Date -Format 'HH:mm')  최신 받기 완료(올릴 기록 없음)"
    }
} finally {
    if ($tr) { try { Stop-Transcript | Out-Null } catch {} }
}
