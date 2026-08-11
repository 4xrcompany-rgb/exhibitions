' 4XR 작업기록 동기화 - 완전 숨김 실행기
' wscript 가 powershell 을 창 없이(0) 실행한다. 같은 폴더의 sync_log.ps1 을 돌린다.
Dim fso, here
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
CreateObject("WScript.Shell").Run "powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File """ & here & "\sync_log.ps1""", 0, False
