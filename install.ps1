# Automated installer for mpvremote Windows version 

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
        "Winget not exists on your system, you have to install it manually!"
        "You can download it from here:"
        "https://nodejs.org/en/download/"
        Read-Host "If you ready press enter"
        Refresh-Path
    }
}

# Node.JS and NPM required dependency. If there's winget binary we can install it for user.
$npmExists = Check-Command -cmdname "npm1";
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
    }
}