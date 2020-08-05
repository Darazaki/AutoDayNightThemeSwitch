# Auto Day/Night Theme Switch `adnts`

A GNOME extension to automatically switch themes depending on the time of the
day

![Beautiful banner](images/banner.png)

## Features

![Screen pic](images/screenshot.png)

- Customize your day/night GTK & GNOME Shell themes
- Run custom commands when day/night comes
- Tweak when the day/night change happen
- Edit how often the extension should look for the day/night change (Advanced)

## Limitations

- Changing the GTK/GNOME Shell theme the usual during the daytime way will only
  set it for the day state and won't change it for the night state (same with
  changing it during the night state), use `adnts`'s preferences panel instead
- GNOME Shell themes are only supported if the [User
  Themes](https://extensions.gnome.org/extension/19/user-themes) extension is
  installed and enabled and if GNOME Shell's version is 3.34 or later
- 24h format only in the preferences
- There is no guarantee that the day/night commands are ran only once during a
  full day:
  - Re-enabling the extension will re-run the command for the current state
  - If several state changes happen quickly enough, it is possible that the
    command will be ran several times in parallel: if that's a problem you
    should move your commands to a script and watch for other instances of that
    script when it is started

## Install/Update

Clone this repo and run `path/to/repo/install.sh path/to/install/dir` from
anywhere on your system to create the `adnts@n.darazaki` sub-directory and copy
the required files into it

The `path/to/install/dir` parameter defaults to
`~/.local/share/gnome-shell/extensions`, the default user path where GNOME
searches for extensions

E.g. user installation:

```sh
git clone https://github.com/Darazaki/AutoDayNightThemeSwitch adnts
adnts/install.sh
```

E.g. root installation:

```sh
git clone https://github.com/Darazaki/AutoDayNightThemeSwitch adnts
sudo adnts/install.sh /usr/share/gnome-shell/extensions
```

After that, re-login then configure and enable the extension from GNOME Tweaks
or with:

```sh
gnome-extensions prefs adnts@n.darazaki
gnome-extensions enable adnts@n.darazaki
```

Once enabled your GTK theme will be overridden with the ones specified in
`adnts`'s preferences panel so make sure to change your themes there

Leave a GNOME Shell theme field blank to use the default one

## Uninstall

```sh
# Add `sudo` if needed
rm -rf path/to/install/dir/adnts@n.darazaki
```

Then re-login to make sure GNOME unloaded the extension

## Alternatives

If you're unhappy with this extension, you might want to take a look at some
alternatives:

- [Night Theme
  Switcher](https://gitlab.com/rmnvgr/nightthemeswitcher-gnome-shell-extension)
  by rmnvgr

> Automatically toggle your light and dark GTK and GNOME Shell theme variants,
> switch backgrounds and launch custom commands at sunset and sunrise

- [Dark Mode
  Switcher](https://github.com/lossurdo/gnome-shell-extension-dark-mode) by
  lossurdo

> Switch GNOME 3 theme to Dark Mode and back (this version supports only Adwaita
> and Adwaita-dark)

## License

This project uses the GPLv3 license (see: [LICENSE.txt](LICENSE.txt))

## Contribute

Every kind of contribution is welcome!

If you want something to be changed, please open an issue or a PR and I'll take
a look at your suggestions ASAP

Any contribution will be published under the same licensing terms indicated
previously
