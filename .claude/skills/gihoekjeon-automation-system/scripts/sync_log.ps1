# 작업기록을 중앙(GitHub)으로 올린다.
# - '기록/' 폴더만 커밋한다(시스템 파일은 절대 건드리지 않음).
# - 올리기 전에 pull --rebase 로 관리자 개선분(system)을 받아온다.
# 사용: 저장소 루트에서  powershell -ExecutionPolicy Bypass -File .claude/skills/gihoekjeon-automation-system/scripts/sync_log.ps1

$ErrorActionPreference = "Continue"

# 저장소 루트로 이동 (이 스크립트 위치 기준 3단계 위)
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
}

# 관리자 개선분 받아오고(충돌 없으면 자동), 내 기록 올림
git pull --rebase --autostash
git push

Write-Host "동기화 완료 — 작업자: $who"
