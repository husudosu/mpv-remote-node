#!/usr/bin/env bash
# Automated installer for mpvremote Linux version
# Get MPV Path
MPV_PATH=""
if [[ -z "${MPV_HOME}" ]]; then
    if [[ -z "${XDG_CONFIG_HOME}" ]]; then
        MPV_PATH="${HOME}/.config/mpv"
    else
        MPV_PATH="${XDG_CONFIG_HOME}/mpv"
    fi
else
    MPV_PATH=${MPV_HOME}
fi

bashScriptPath="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
scriptOptsFolder="$MPV_PATH/script-opts"
mpvScriptFolder="$MPV_PATH/scripts"

pluginPath="$bashScriptPath/mpvremote"
scriptOptsPath="$bashScriptPath/mpvremote.conf"
mainPath="$bashScriptPath/remoteServer.js"
watchlistHandlerPath="$bashScriptPath/watchlisthandler.js"

destPluginPath="$MPV_PATH/scripts/mpvremote"
destScriptOptsPath="$scriptOptsFolder/mpvremote.conf"
destMainPath="$destPluginPath/remoteServer.js"
destWatchlistHandlerPath="$destPluginPath/watchlisthandler.js"

mkdir -p "$mpvScriptFolder" && cp -r "$pluginPath" "$mpvScriptFolder"
ln -sf "$mainPath" "$destMainPath"

copyOpts(){
    mkdir -p "$scriptOptsFolder" && cp -r "$scriptOptsPath" "$scriptOptsFolder"
}

watchlistHandler(){
    ln -sf "$watchlistHandlerPath" "$destWatchlistHandlerPath"
}

while true; do
    read -p "Use watchlist handler? [Y/N](Default: Y)" Yn
    case $Yn in
        [Yy]* ) watchlistHandler;break;;
        [Nn]* ) break;;
        "") watchlistHandler; break;;
        * ) echo "Please answer yes or no.";;
    esac
done

while true; do
    read -p "Copy default config? [Y/N](Default: Y)" Yn
    case $Yn in
        [Yy]* ) copyOpts; break;;
        [Nn]* ) break;;
        "") copyOpts; break;;
        * ) echo "Please answer yes or no.";;
    esac
done

echo "Wizzard done. MPV remote should launch when running MPV"
echo "Download the Android app here: https://github.com/husudosu/mpv-remote-app/releases/latest"