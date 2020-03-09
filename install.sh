#!/bin/sh

# Path to the repository's root
src=$(dirname "$0")

# Default the installation path to '~/.local/share/gnome-shell/extensions'
if [ $# -ge 1 ]
then
    path=$@
else
    path=~/.local/share/gnome-shell/extensions
fi

# Check that the installation path is a directory
if [ ! -e "$path" ]
then
    # Create it if it doesn't exist yet
    mkdir -p "$path"
elif [ ! -d "$path" ]
then
    echo "'$path' is not a directory"
    exit 1
fi

# Remove previous installation if any
if [ -d "$path/adnts@n.darazaki" ]
then
    read -p 'Previous installation found. Replace it? [Y/n]: ' choice
    if [ -z "$choice" ] || [ "$choice" = 'y' ] || [ "$choice" = 'Y' ]
    then
        rm -rf "$path/adnts@n.darazaki"
    else
        exit 1
    fi
fi

# Create the extension directory
mkdir -p "$path/adnts@n.darazaki/schemas"

# Copy the necessary files
cp "$src/extension.js" "$path/adnts@n.darazaki"
cp "$src/prefs.js" "$path/adnts@n.darazaki"
cp "$src/metadata.json" "$path/adnts@n.darazaki"
cp "$src/schemas/gschemas.compiled" "$path/adnts@n.darazaki/schemas"
cp "$src/schemas/org.gnome.shell.extensions.adnts@n.darazaki.gschema.xml" \
    "$path/adnts@n.darazaki/schemas"

# Done!
echo 'Installation finished!'
