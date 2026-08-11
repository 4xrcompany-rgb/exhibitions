# 4XR 관리자 전체보기 - 볼트 안 모든 저장소를 최신화(pull)
# 스케줄러(30분마다)가 이 파일을 부른다. 이 파일이 있는 폴더 = 볼트 루트.
$vault = $PSScriptRoot
$log = Join-Path $env:TEMP "4xr_all_sync.log"
$now = Get-Date -Format 'yyyy-MM-dd HH:mm'
"[$now] sync start: $vault" | Out-File -FilePath $log -Append -Encoding utf8

Get-ChildItem -LiteralPath $vault -Directory | ForEach-Object {
  $repo = $_.FullName
  if (Test-Path (Join-Path $repo ".git")) {
    Set-Location -LiteralPath $repo
    $r = git pull --rebase --autostash --no-edit 2>&1
    "  - $($_.Name): $r" | Out-File -FilePath $log -Append -Encoding utf8
  }
}
"[$now] sync done" | Out-File -FilePath $log -Append -Encoding utf8
