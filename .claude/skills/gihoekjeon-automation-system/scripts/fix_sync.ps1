# 4XR 동기화 "도스창 깜빡임" 진단 + 정리
#  · 작업자 PC의 동기화 관련 예약작업을 모두 찾아 바탕화면에 보고서로 남긴다.
#  · 군더더기(중복·.bat 직접실행 등)를 제거하고, 깨끗한 것 하나만 재등록한다.
#  · 관리자 전체보기(4XR_all_sync)는 건드리지 않는다.
$ErrorActionPreference = "SilentlyContinue"

$report = Join-Path ([Environment]::GetFolderPath('Desktop')) '4XR_동기화_정리결과.txt'
function Log($m){ $m | Out-File -FilePath $report -Append -Encoding utf8 }
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm')] 4XR 동기화 정리 시작" | Out-File -FilePath $report -Encoding utf8
Log ""

# ── 1) 동기화 관련(Microsoft 기본 제외) 예약작업 훑기 ─────────────
$cand = Get-ScheduledTask | Where-Object { $_.TaskPath -notlike '\Microsoft\*' } | Where-Object {
    $act = ($_.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)" }) -join ' '
    ($act -match 'sync_log|sync_all|기록|4XR|Documents\\4XR|exhibitions|selecshop|기획전') -or
    ($_.TaskName -match '4XR|기록|동기화|sync|exhibition|기획전')
}

Log "── 찾은 동기화 관련 예약작업 ──"
if (-not $cand) { Log "  (없음)" }
foreach($t in $cand){
    $act = ($t.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)" }) -join '  |  '
    Log "  · [$($t.State)] $($t.TaskPath)$($t.TaskName)"
    Log "        실행: $act"
}
Log ""

# ── 2) 군더더기 제거 (4XR_all_sync = 관리자 전체보기는 유지) ────────
Log "── 제거 ──"
$removed = 0
foreach($t in $cand){
    if ($t.TaskName -eq '4XR_all_sync') { Log "  유지: 4XR_all_sync (관리자 전체보기)"; continue }
    try {
        Unregister-ScheduledTask -TaskName $t.TaskName -TaskPath $t.TaskPath -Confirm:$false -ErrorAction Stop
        Log "  제거함: $($t.TaskPath)$($t.TaskName)"; $removed++
    } catch { Log "  제거실패: $($t.TaskName) — $($_.Exception.Message)" }
}
if ($removed -eq 0) { Log "  (제거할 것 없음)" }
Log ""

# ── 3) 깨끗한 작업 하나만 재등록 (워커 저장소가 있을 때만) ──────────
Log "── 재등록 ──"
$dest = Join-Path $env:USERPROFILE 'Documents\4XR_기획전'
$syncScript = Join-Path $dest '.claude\skills\gihoekjeon-automation-system\scripts\sync_log.ps1'
if (Test-Path $syncScript) {
    # 완전 숨김 실행기(wscript+vbs)가 있으면 그걸로 등록 → 파란창도 안 뜸. 없으면 숨김 powershell.
    $vbs = Join-Path (Split-Path $syncScript) 'sync_hidden.vbs'
    if (Test-Path $vbs) {
        $action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('"{0}"' -f $vbs)
    } else {
        $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
            -Argument ("-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"{0}`"" -f $syncScript)
    }
    # 30분마다. StartWhenAvailable 일부러 끔(놓친 실행 몰아치기 방지). 겹치면 새 실행 무시.
    $trig = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(3)) `
        -RepetitionInterval (New-TimeSpan -Minutes 30)
    $set = New-ScheduledTaskSettingsSet -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName '4XR_기획전_기록동기화' -Action $action -Trigger $trig -Settings $set `
        -Description "4XR 작업기록 자동 동기화(숨김·30분)" -Force | Out-Null
    Log "  재등록: 4XR_기획전_기록동기화 (powershell 숨김, 30분, 몰아치기 없음, 겹침무시)"
} else {
    Log "  워커 저장소가 없어 재등록 생략: $syncScript"
    Log "  (관리자 PC라면 정상 — 여기선 4XR_all_sync 만 있으면 됩니다.)"
}
Log ""
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm')] 정리 끝 — 이제 도스창 깜빡임이 멈춰야 합니다." | Out-File -FilePath $report -Append -Encoding utf8

Start-Process notepad.exe $report
