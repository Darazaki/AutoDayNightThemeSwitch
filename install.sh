#!/bin/sh

# Path to the repository's root
src=$(dirname "$0")

# Default the installation path to '~/.local/share/gnome-shell/extensions'
if [ $# -ge 1 ]
then
    path="$@"
else
    path=~/.local/share/gnome-shell/extensions
fi

# Called if something goes wrong
die() {
    echo 'Installation failed:' "$@"
    exit 1
}

# Check that the installation path is a directory
if [ ! -e "$path" ]
then
    # Create it if it doesn't exist yet
    mkdir -p "$path" \
        || die "Cannot create '$path'"
elif [ ! -d "$path" ]
then
    die "'$path' is not a directory"
fi

# Remove previous installation if any
if [ -d "$path/adnts@n.darazaki" ]
then
    read -p 'Previous installation found. Replace it? [Y/n]: ' choice
    if [ -z "$choice" ] || [ "$choice" = 'y' ] || [ "$choice" = 'Y' ]
    then
        rm -rf "$path/adnts@n.darazaki" \
            || die "Cannot remove '$path/adnts@n.darazaki'"
    else
        echo 'Nothing installed'
        exit 1
    fi
fi

# Create the extension directory
mkdir -p "$path/adnts@n.darazaki/schemas" \
    || die "Cannot create directory '$path/adnts@n.darazaki/schemas'"

# Copy the necessary files
cp "$src/extension.js" \
    "$src/prefs.js" \
    "$src/metadata.json" \
    "$path/adnts@n.darazaki" \
    || die "Cannot copy files to '$path/adnts@n.darazaki'"
cp "$src/schemas/gschemas.compiled" \
    "$src/schemas/org.gnome.shell.extensions.adnts@n.darazaki.gschema.xml" \
    "$path/adnts@n.darazaki/schemas" \
    || die "Cannot copy files to '$path/adnts@n.darazaki/schemas'"

# Done!
echo 'Installation finished!'
