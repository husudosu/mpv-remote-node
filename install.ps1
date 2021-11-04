# Automated installer for mpvremote Windows version 

$MPV_PATH = "$env:APPDATA/mpv";
if ($Env:MPV_HOME){
    $MPV_PATH = $Env:MPV_HOME
}

# Script path for older Powershell versions.
$scriptPath = split-path -parent $MyInvocation.MyCommand.Definition

$pluginPath = Join-Path -Path "$scriptPath" -ChildPath "mpvremote"
$scriptOptsPath = Join-Path -Path "$scriptPath" -ChildPath "mpvremote.conf"
$mainPath = Join-Path -Path "$scriptPath" -ChildPath "remoteServer.js"
$watchlistHandlerPath = Join-Path -Path "$scriptPath" -ChildPath "watchlisthandler.js"

$destPluginPath = Join-Path -Path "$MPV_PATH" -ChildPath "\scripts\mpvremote"
$destScriptOptsPath = Join-Path "$MPV_PATH" -ChildPath "\script-opts\mpvremote.conf"
$destMainPath = Join-Path -Path "$destPluginPath" -ChildPath "remoteServer.js"
$destWatchlistHandlerPath = Join-Path -Path "$destPluginPath" -ChildPath "watchlisthandler.js"

"xcopy /i $pluginPath $destPluginPath"
"echo f | xcopy /f /y $scriptOptsPath $destscriptOptsPath"
"New-Item -ItemType SymbolicLink -Path $destMainPath -Target $mainPath"
"New-Item -ItemType SymbolicLink -Path $destWatchlistHandlerPath -Target $watchlistHandlerPath"