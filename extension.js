'use strict';


// Imports:
const { GLib, Gio, GObject } = imports.gi;
const MainLoop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { extensionManager } = imports.ui.main;


/** Identifier used for the time checking loop */
let timeCheckId = 0;

/** 
 * Optional bool that indicates if the night theme has been set
 * 
 * This variable can take the following values:
 * 
 * - `null` => unknown
 * - `true` => night theme set
 * - `false` => light theme set
 * 
 * If unknown, the theme corresponding to the current time will be set
 * 
 * @type {boolean | null}
 */
let hasNightThemeBeenSet = null;

/** Extension's settings */
let settings = null;

/** GNOME's settings */
let gnomeSettings = null;

/**
 * User Themes shell settings
 * 
 * This variable will be `null` if the settings cannot be found
 */
let shellSettings = null;


// VALUES TAKEN FROM SETTINGS (BEGIN)
// The following values do not have any impact on the program and are just there
// for type checking purpose

/** The period at which the time of the day is checked */
let timeCheckPeriod = 1 /* ms */;

/** Start and end of the nighttime */
const nighttime = {
    // Expressed in minutes since the start of the day

    /** Night begins, day ends */
    begin: 0 /* minutes */,
    /** Night ends, day begin */
    end: 0 /* minutes */,
};

/** Day and night themes */
const theme = {
    /** Day theme's name */
    day: '',
    /** Night theme's name */
    night: '',
}

/** Day and night shell themes */
const shell = {
    /** Day shell theme's name */
    day: '',
    /** Night shell theme's name */
    night: '',
}

/** Day and night commands */
const command = {
    /* Command executed when the day starts */
    day: '',
    /* Command executed when the night starts */
    night: '',
}

/** Is the shell part of the extension enabled? */
let isShellPartEnabled = false;

/** Is command execution on theme switch enabled? */
let areCommandsEnabled = false;
// VALUES TAKEN FROM SETTINGS (END)


/**
 * Get the values from the extension's settings and make it so they can be
 * updated automatically
 */
function setupExtensionSettings() {
    // Get the GSchema source so we can lookup our settings
    let schema = Gio.SettingsSchemaSource.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false,
    );

    // Get the settings
    settings = new Gio.Settings({
        settings_schema: schema.lookup(
            'org.gnome.shell.extensions.adnts@n.darazaki',
            true,
        ),
    });

    // Read settings
    theme.day = settings.get_string('day-theme');
    theme.night = settings.get_string('night-theme');
    shell.day = settings.get_string('day-shell');
    shell.night = settings.get_string('night-shell');
    isShellPartEnabled = settings.get_boolean('shell-enabled');
    command.day = settings.get_string('day-command');
    command.night = settings.get_string('night-command');
    areCommandsEnabled = settings.get_boolean('commands-enabled');
    nighttime.begin = settings.get_uint('nighttime-begin');
    nighttime.end = settings.get_uint('nighttime-end');
    timeCheckPeriod = settings.get_uint('time-check-period');


    // Watch for changes


    // DAY THEMES
    settings.connect('changed::day-theme', function () {
        theme.day = settings.get_string('day-theme');
        if (hasNightThemeBeenSet === false) {
            // It's daytime

            // This will set the new theme after a certain amount of time,
            // it was made to avoid the lag created by `setGTKTheme`
            hasNightThemeBeenSet = null;

            // Uncommenting `setGTKTheme` will make theme changes instantaneous
            // but it will also make your computer lag when editing the day
            // theme's name

            //setGTKTheme(theme.day);
        }
    });
    settings.connect('changed::day-shell', function () {
        shell.day = settings.get_string('day-shell');
        if (hasNightThemeBeenSet === false) {
            // It's daytime

            // Will set the new shell theme after some time
            hasNightThemeBeenSet = null;
        }
    });

    // NIGHT THEMES
    settings.connect('changed::night-theme', function () {
        theme.night = settings.get_string('night-theme');
        if (hasNightThemeBeenSet === true) {
            // It's nighttime

            // This will set the new theme after a certain amount of time,
            // it was made to avoid the lag created by `setGTKTheme`
            hasNightThemeBeenSet = null;

            // Uncommenting `setGTKTheme` will make theme changes instantaneous
            // but it will also make your computer lag when editing the night
            // theme's name

            //setGTKTheme(theme.night);
        }
    });
    settings.connect('changed::night-shell', function () {
        shell.night = settings.get_string('night-shell');
        if (hasNightThemeBeenSet === true) {
            // It's nighttime

            // Will set the new shell theme after some time
            hasNightThemeBeenSet = null;
        }
    });

    // NIGHTTIME BEGIN
    settings.connect('changed::nighttime-begin', function () {
        // This it automatically updated so no need for extra tweaks
        nighttime.begin = settings.get_uint('nighttime-begin');
    });

    // NIGHTTIME END
    settings.connect('changed::nighttime-end', function () {
        // This it automatically updated so no need for extra tweaks
        nighttime.end = settings.get_uint('nighttime-end');
    });

    // TIME CHECK PERIOD
    settings.connect('changed::time-check-period', function () {
        timeCheckPeriod = settings.get_uint('time-check-period');

        // Replace the period
        MainLoop.source_remove(timeCheckId);
        timeCheckId = MainLoop.timeout_add(timeCheckPeriod, timeCheck, null);
    });

    // SHELL ENABLED
    settings.connect('changed::shell-enabled', function () {
        isShellPartEnabled = settings.get_boolean('shell-enabled');

        if (isShellPartEnabled) {
            // Set the new theme
            hasNightThemeBeenSet = null;
        } else {
            // Disable connections with User Themes' settings
            shellSettings = null;
        }
    });

    // Let's not run the commands on change

    // COMMANDS ENABLED
    settings.connect('changed::commands-enabled', function () {
        areCommandsEnabled = settings.get_boolean('commands-enabled');
    });

    // DAY COMMAND
    settings.connect('changed::day-command', function () {
        command.day = settings.get_string('day-command');
    });

    // NIGHT COMMAND
    settings.connect('changed::night-command', function () {
        command.night = settings.get_string('night-command');
    });
}


/**
 * Allow reading and writing values from GNOME's settings and automatically
 * update the day/night themes when the user changes their GTK theme
 */
function setupGNOMESettings() {
    // Get GNOME's settings
    gnomeSettings = new Gio.Settings({
        schema: 'org.gnome.desktop.interface',
    });

    // Update the extension's settings when the user changes their GTK theme
    gnomeSettings.connect('changed::gtk-theme', function () {
        let newTheme = gnomeSettings.get_string('gtk-theme');

        if (isNighttime()) {
            if (newTheme !== theme.night) {
                settings.set_string('night-theme', newTheme);
            }
        } else if (newTheme !== theme.day) {
            settings.set_string('day-theme', newTheme);
        }
    });
}


/**
 * Allow reading and writing values from User Themes' settings and automatically
 * update the day/night shell themes when the user changes their shell theme
 * 
 * @returns {boolean} If User Themes' settings could be found
 */
function setupShellSettings() {
    // Get User Themes (this may fail)
    let userThemesExtension = extensionManager.lookup(
        'user-theme@gnome-shell-extensions.gcampax.github.com',
    );
    if (userThemesExtension === undefined) {
        // User Themes isn't installed
        return false /* settings not found */;
    }

    let schemaDir = userThemesExtension.dir.get_child('schemas');

    let schema;
    if (schemaDir.query_exists(null)) {
        schema = Gio.SettingsSchemaSource.new_from_directory(
            schemaDir.get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false,
        );
    } else {
        schema = Gio.SettingsSchemaSource.get_default();
    }

    shellSettings = new Gio.Settings({
        settings_schema: schema.lookup(
            'org.gnome.shell.extensions.user-theme',
            true,
        ),
    });

    // Update the extension's settings when the user changes their shell theme
    shellSettings.connect('changed::name', function () {
        let newTheme = shellSettings.get_string('name');

        if (isNighttime()) {
            if (newTheme !== shell.night) {
                settings.set_string('night-shell', newTheme);
            }
        } else if (newTheme !== shell.day) {
            settings.set_string('day-shell', newTheme);
        }
    });

    return true /* settings found */;
}


/**
 * Set the default GTK theme to a new theme.
 * 
 * @param {string} themeName The new theme's name.
 */
function setGTKTheme(themeName) {
    gnomeSettings.set_string('gtk-theme', themeName);
}


/**
 * Set the shell's theme
 * 
 * @param {string} themeName The new theme's name
 */
function setShellTheme(themeName) {
    if (isShellPartEnabled && isShellAvailable()) {
        shellSettings.set_string('name', themeName);
    }
}


/**
 * Run a command in the background using `/bin/sh -c 'COMMAND'` if commands are
 * enabled
 * 
 * @param {string} command The command to execute
 * 
 * @returns {boolean} If spawning the command succeeded
 */
function runCommand(command) {
    command = command.trim();

    if (areCommandsEnabled && command.length != 0) {
        return GLib.spawn_async(
            null /* inherit working directory */,
            ['/bin/sh', '-c', command],
            null /* inherit environment variables */,
            GLib.SpawnFlags.DEFAULT,
            null /* nothing to execute before */,
            null /* no extra data to pass */,
            null /* no error handler */,
        );
    } else {
        // Either commands are disabled so trying to run one should always fail
        // or there is no command to execute so it should also fail
        return false;
    }
}


/** Set the GTK and shell themes to the night themes if not already done */
function setNightThemesIfNeeded() {
    if (hasNightThemeBeenSet !== true) {
        // Either night theme or unknown

        hasNightThemeBeenSet = true;

        setGTKTheme(theme.night);
        setShellTheme(shell.night);
        runCommand(command.night);
    }
}


/** Set the GTK and shell themes to the day themes if not already done */
function setDayThemesIfNeeded() {
    if (hasNightThemeBeenSet !== false) {
        // Either day theme or unknown

        hasNightThemeBeenSet = false;

        setGTKTheme(theme.day);
        setShellTheme(shell.day);
        runCommand(command.day)
    }
}


/**
 * Calculate if now is nighttime
 * 
 * @returns {boolean} Is it nighttime?
 */
function isNighttime() {
    let now = new Date();
    // Minutes elapsed since midnight
    let minutesInDay = now.getHours() * 60 + now.getMinutes();
    // Is it nighttime?
    let result = false;

    if (nighttime.begin < nighttime.end) {
        //   day (end)    night    day (begin)
        // +++++++++++++---------+++++++++++++++

        if (nighttime.begin <= minutesInDay && minutesInDay < nighttime.end) {
            // Night

            result = true;
        }
    } else /* if (nightTime.begin >= nightTime.end) */ {
        //  night (end)   day   night (begin)
        // -------------+++++++---------------

        if (minutesInDay < nighttime.end || nighttime.begin <= minutesInDay) {
            // Night

            result = true;
        }
    }

    return result;
}


/** 
 * Check if the User Themes extension can be used
 * 
 * @returns {boolean} If the User Themes extension can be used
 */
function isShellAvailable() {
    return shellSettings !== null || setupShellSettings();
}


/**
 * Check if it is day or night time and set the theme accordingly if needed
 * 
 * @returns {boolean} `true` (which means repeat the loop indefinitely)
 */
function timeCheck() {
    if (isNighttime()) {
        setNightThemesIfNeeded();
    } else {
        setDayThemesIfNeeded();
    }

    return true /* repeat */;
}


/**
 * Make a promise that only finishes executing once the `extensionManager` has
 * been initialized
 * 
 * @returns {Promise<void>} The promise
 */
async function extensionManagerInitialized() {
    while (!extensionManager._initialized) {
        // Prevent an infinite blocking loop and allow continuing execution
        // while this loop is running in the background
        await null;
    }
}


/** Executed when the extension is enabled by the user or on session boot */
function enable() {
    // Initial setup for reading user preferences, the GNOME interface
    // preferences and the User Themes preferences
    setupExtensionSettings();
    setupGNOMESettings();
    // We must wait for the extension manager before we can access User Themes
    // and reset the theme to the right one depending on the time
    extensionManagerInitialized().then(function () {
        if (isShellPartEnabled && setupShellSettings()) {
            if (hasNightThemeBeenSet === true) {
                setShellTheme(theme.night);
            } else if (hasNightThemeBeenSet === false) {
                setShellTheme(theme.day);
            }
        }
    });

    // Run now
    timeCheck();
    // Run every `timeCheckPeriod` starting from now
    timeCheckId = MainLoop.timeout_add(timeCheckPeriod, timeCheck, null);
}


/**
 * Executed when the extension is disabled by the user or on session shutdown
 */
function disable() {
    // Remove the repeating check
    MainLoop.source_remove(timeCheckId);

    // Stop watching for changes in the settings
    settings = null;
    gnomeSettings = null;
    shellSettings = null;
}


/**
 * This function is absolutely vital to the proper functioning of this
 * extension, and what it does is literally nothing
 */
function init() { }
