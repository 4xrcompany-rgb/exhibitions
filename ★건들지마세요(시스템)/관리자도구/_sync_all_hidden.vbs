' 4XR 전체보기 동기화 - 완전 숨김 실행기
' wscript 가 powershell 을 창 없이(0) 실행한다. 같은 폴더의 _sync_all.ps1 을 돌린다.
Dim fso, here
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
CreateObject("WScript.Shell").Run "powershell -NoProfile -ExecutionPolicy Bypass -File """ & here & "\_sync_all.ps1""", 0, False
