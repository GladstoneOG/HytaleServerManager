Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = ScriptDir

If FSO.FileExists(ScriptDir & "\node_modules\electron\dist\electron.exe") Then
    WshShell.Run """" & ScriptDir & "\node_modules\electron\dist\electron.exe"" .", 0, False
Else
    WshShell.Run "cmd.exe /c npx electron .", 0, False
End If
