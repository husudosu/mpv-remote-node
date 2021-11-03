# Automated installer for mpvremote Windows version 

$MPV_PATH = "%APPDATA%/mpv";
if ($Env:MPV_HOME){
    $MPV_PATH = $Env:MPV_HOME
}

# Script path for older Powershell versions.
$scriptPath = split-path -parent $MyInvocation.MyCommand.Definition

$pluginPath = Join-Path -Path "$scriptPath" -ChildPath "mpvremote"
$mainPath = Join-Path -Path "$scriptPath" -ChildPath "remote.socketio.js"
$watchlistHandlerPath = Join-Path -Path "$scriptPath" -ChildPath "watchlisthandler.js"

$destPluginPath = Join-Path -Path "$MPV_PATH" -ChildPath "\scripts\mpvremote"
$destMainPath = Join-Path -Path "$destPluginPath" -ChildPath "remote.socketio.js"
$destWatchlistHandlerPath = Join-Path -Path "$destPluginPath" -ChildPath "watchlisthandler.js"

function Check-Command($cmdname)
{
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}


function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") +
                ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
}

function Install-NodeJS(){
    # Installing via winget.
    if ($wingetExists){
        Invoke-Expression "winget install OpenJS.NodeJS.LTS"
        Refresh-Path
    }
    else {
        "Winget not exists on your system, you have to install Node manually!"
        "You can download it from here:"
        "https://nodejs.org/en/download/"
        Read-Host "If you ready press enter"
        Refresh-Path
    }
}

# Node.JS and NPM required dependency. If there's winget binary we can install it for user.
$npmExists = Check-Command -cmdname "npm";
$wingetExists = Check-Command -cmdname "winget";

if (-NOT $npmExists){
    "Node.JS not detected on your computer. It's required dependency."
    $answer = Read-Host "Would you like install it? [Y/N](default Y)"
    $answer = $answer.ToUpper()
    
    if ($answer -eq "y" -or $answer -eq "" ){
        "Installing Node.JS..."
        Install-NodeJS

    }
    else {
        "Not installing"
        Exit;
    }
}

# Check if still not exits
$npmExists = Check-Command -cmdname "npm";
if (-NOT $npmExists){
    "Node JS still not installed, quiting.";
    Exit;
}

"npm install ."
"xcopy /i $pluginPath $destPluginPath"
"New-Item -ItemType SymbolicLink -Path $destMainPath -Target $mainPath"
"New-Item -ItemType SymbolicLink -Path $destWatchlistHandlerPath -Target $watchlistHandlerPath"