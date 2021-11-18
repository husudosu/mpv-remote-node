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

function Check-IsElevated
 {
    $id = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object System.Security.Principal.WindowsPrincipal($id)
    if ($p.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator))
   { Write-Output $true }      
    else
   { Write-Output $false }   
 }


if (-NOT(Check-IsElevated)){
    "For creating symbolic links, you need run this script as administrator!"
    Exit
}

# Copy base plugin directory
xcopy /i $pluginPath $destPluginPath
# Symlink for remoteServer.js
Remove-Item $destMainPath -ErrorAction Ignore
New-Item -ItemType SymbolicLink -Path $destMainPath -Target $mainPath

$shouldUseWatchlist = Read-Host "Use watchlist handler? [Y/N](Default:Y)"
if ($shouldUseWatchlist -ne "N"){
    Remove-Item $destWatchlistHandlerPath -ErrorAction Ignore
    New-Item -ItemType SymbolicLink -Path $destWatchlistHandlerPath -Target $watchlistHandlerPath
}

$shouldCopyConfig = Read-Host "Copy default config? [Y/N](Default:Y)"

if ($shouldCopyConfig.ToUpper() -ne "N"){
    echo "f" | xcopy /f /y $scriptOptsPath $destscriptOptsPath
}


"Wizzard done. MPV remote should launch when running MPV"
"Download the Android app here: https://github.com/husudosu/mpv-remote-app/releases/latest"