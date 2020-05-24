'use strict';


// Imports:
const { GLib, Gio, GObject } = imports.gi;
const MainLoop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { extensionManager } = imports.ui.main;


/**
 * A state for a something managed by this extension
 * 
 * If unknown, the action corresponding to the current time will be performed
 */
const State = {
    UNKNOWN: 0,
    DAY: 1,
    NIGHT: 2,
};

// If the functionality is available, make `State`'s fields constant and prevent
// new fields from being added
if (Object.freeze) {
    Object.freeze(State);
}


/** Something managed by this extension */
class Managed {
    constructor() {
        this.day = '';
        this.night = '';
        this.state = State.UNKNOWN;
        this.enabled = false;
    }
}


/** Identifier used for the time checking loop */
let timeCheckId = 0;

/** Extension's settings */
let extensionSettings = null;

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

/** GTK themes */
const gtk = new Managed();

/** Shell themes */
const shell = new Managed();

/** Day and night commands */
const command = new Managed();
// VALUES TAKEN FROM SETTINGS (END)


/**
 * Get the values from the extension's settings and make it so they will be
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
    extensionSettings = new Gio.Settings({
        settings_schema: schema.lookup(
            'org.gnome.shell.extensions.adnts@n.darazaki',
            true,
        ),
    });

    // Read settings
    gtk.day = extensionSettings.get_string('day-theme');
    gtk.night = extensionSettings.get_string('night-theme');
    shell.day = extensionSettings.get_string('day-shell');
    shell.night = extensionSettings.get_string('night-shell');
    shell.enabled = extensionSettings.get_boolean('shell-enabled');
    command.day = extensionSettings.get_string('day-command');
    command.night = extensionSettings.get_string('night-command');
    command.enabled = extensionSettings.get_boolean('commands-enabled');
    nighttime.begin = extensionSettings.get_uint('nighttime-begin');
    nighttime.end = extensionSettings.get_uint('nighttime-end');
    timeCheckPeriod = extensionSettings.get_uint('time-check-period');


    // Watch for changes


    // DAY THEMES
    extensionSettings.connect('changed::day-theme', function () {
        gtk.day = extensionSettings.get_string('day-theme');
        if (gtk.state === State.DAY) {
            // It's daytime

            // This will set the new theme after a certain amount of time,
            // it was made to avoid the lag created by `setGTKTheme`
            gtk.state = State.UNKNOWN;

            // Uncommenting `setGTKTheme` will make theme changes instantaneous
            // but it will also make your computer lag when editing the day
            // theme's name

            //setGTKTheme(theme.day);
        }
    });
    extensionSettings.connect('changed::day-shell', function () {
        shell.day = extensionSettings.get_string('day-shell');
        if (shell.state === State.DAY) {
            // It's daytime

            // Will set the new shell theme after some time
            shell.state = State.UNKNOWN;
        }
    });

    // NIGHT THEMES
    extensionSettings.connect('changed::night-theme', function () {
        gtk.night = extensionSettings.get_string('night-theme');
        if (gtk.state === State.NIGHT) {
            // It's nighttime

            // This will set the new theme after a certain amount of time,
            // it was made to avoid the lag created by `setGTKTheme`
            gtk.state = State.UNKNOWN;

            // Uncommenting `setGTKTheme` will make theme changes instantaneous
            // but it will also make your computer lag when editing the night
            // theme's name

            //setGTKTheme(theme.night);
        }
    });
    extensionSettings.connect('changed::night-shell', function () {
        shell.night = extensionSettings.get_string('night-shell');
        if (shell.state === State.NIGHT) {
            // It's nighttime

            // Will set the new shell theme after some time
            shell.state = State.UNKNOWN;
        }
    });

    // NIGHTTIME BEGIN
    extensionSettings.connect('changed::nighttime-begin', function () {
        // This it automatically updated so no need for extra tweaks
        nighttime.begin = extensionSettings.get_uint('nighttime-begin');
    });

    // NIGHTTIME END
    extensionSettings.connect('changed::nighttime-end', function () {
        // This it automatically updated so no need for extra tweaks
        nighttime.end = extensionSettings.get_uint('nighttime-end');
    });

    // TIME CHECK PERIOD
    extensionSettings.connect('changed::time-check-period', function () {
        timeCheckPeriod = extensionSettings.get_uint('time-check-period');

        // Replace the period
        MainLoop.source_remove(timeCheckId);
        timeCheckId = MainLoop.timeout_add(timeCheckPeriod, timeCheck, null);
    });

    // SHELL ENABLED
    extensionSettings.connect('changed::shell-enabled', function () {
        shell.enabled = extensionSettings.get_boolean('shell-enabled');

        if (shell.enabled) {
            // Set the new theme
            shell.state = State.UNKNOWN;
        } else {
            // Disable connections with User Themes' settings
            shellSettings = null;
        }
    });

    // Let's not run the commands on change

    // COMMANDS ENABLED
    extensionSettings.connect('changed::commands-enabled', function () {
        command.enabled = extensionSettings.get_boolean('commands-enabled');
    });

    // DAY COMMAND
    extensionSettings.connect('changed::day-command', function () {
        command.day = extensionSettings.get_string('day-command');
    });

    // NIGHT COMMAND
    extensionSettings.connect('changed::night-command', function () {
        command.night = extensionSettings.get_string('night-command');
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
            if (newTheme !== gtk.night) {
                extensionSettings.set_string('night-theme', newTheme);
            }
        } else if (newTheme !== gtk.day) {
            extensionSettings.set_string('day-theme', newTheme);
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
    // `extensionManager` may not exist on the current GNOME Shell version
    if (extensionManager === undefined) {
        return false /* `extensionManager` doesn't exist */;
    }

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
                extensionSettings.set_string('night-shell', newTheme);
            }
        } else if (newTheme !== shell.day) {
            extensionSettings.set_string('day-shell', newTheme);
        }
    });

    return true /* settings found */;
}


/**
 * Set the default GTK theme to a new theme
 * 
 * @param {string} themeName The new theme's name
 */
function setGTKTheme(themeName) {
    gnomeSettings.set_string('gtk-theme', themeName);
}


/**
 * Set the shell's theme if the shell theme functionality is enabled and User
 * Themes can be used
 * 
 * @param {string} themeName The new theme's name
 */
function setShellTheme(themeName) {
    if (shell.enabled && isShellAvailable()) {
        shellSettings.set_string('name', themeName);
    }
}


/**
 * Run a command in the background using `/bin/sh -c 'COMMAND'` if commands are
 * enabled
 * 
 * @param {string} cmd The command to execute
 * 
 * @returns {boolean} If spawning the command succeeded
 */
function runCommand(cmd) {
    cmd = cmd.trim();

    if (command.enabled && cmd.length != 0) {
        return GLib.spawn_async(
            null /* inherit working directory */,
            ['/bin/sh', '-c', cmd],
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


/**
 * Set the GTK and shell themes to the night themes and run the night command if
 * not already done
 */
function setNightThemesIfNeeded() {
    if (gtk.state !== State.NIGHT) {
        // Either day theme or unknown

        setGTKTheme(gtk.night);
        gtk.state = State.NIGHT;
    }

    if (shell.state !== State.NIGHT) {
        setShellTheme(shell.night);
        shell.state = State.NIGHT;
    }

    if (command.state !== State.NIGHT) {
        runCommand(command.night);
        command.state = State.NIGHT;
    }
}


/**
 * Set the GTK and shell themes to the day themes and run the day command if not
 * already done
 */
function setDayThemesIfNeeded() {
    if (gtk.state !== State.DAY) {
        // Either night theme or unknown

        setGTKTheme(gtk.day);
        gtk.state = State.DAY;
    }

    if (shell.state !== State.DAY) {
        setShellTheme(shell.day);
        shell.state = State.DAY;
    }

    if (command.state !== State.DAY) {
        runCommand(command.day);
        command.state = State.DAY;
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
 * Check if it is day or night time and set the themes and run the command
 * accordingly if needed
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
    if (extensionManager && (extensionManager._initialized !== undefined
        || extensionManager._initted !== undefined)) {
        while (!extensionManager._initialized && !extensionManager._initted) {
            // Prevent an infinite blocking loop and allow continuing execution
            // while this loop is running in the background
            await null;
        }
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
        if (shell.enabled && setupShellSettings()) {
            shell.state = State.UNKNOWN;
            timeCheck();
        }
    });

    // Always enabled with the extension
    gtk.enabled = true;

    // Reset the states
    gtk.state = State.UNKNOWN;
    shell.state = State.UNKNOWN;
    command.state = State.UNKNOWN;

    // Run now
    timeCheck();
    // Run every `timeCheckPeriod` starting from now
    timeCheckId = MainLoop.timeout_add(
        timeCheckPeriod /* time interval between each run */,
        timeCheck /* the function to run */,
        null /* no extra data passed to the function */,
    );
}


/**
 * Executed when the extension is disabled by the user or on session shutdown
 */
function disable() {
    // Remove the repeating check
    MainLoop.source_remove(timeCheckId);

    // Stop watching for changes in the settings
    if (extensionSettings !== null) {
        extensionSettings.disconnect('changed::day-theme');
        extensionSettings.disconnect('changed::day-shell');
        extensionSettings.disconnect('changed::night-theme');
        extensionSettings.disconnect('changed::night-shell');
        extensionSettings.disconnect('changed::day-command');
        extensionSettings.disconnect('changed::night-command');
        extensionSettings.disconnect('changed::nighttime-begin');
        extensionSettings.disconnect('changed::nighttime-end');
        extensionSettings.disconnect('changed::time-check-period');
        extensionSettings.disconnect('changed::shell-enabled');
        extensionSettings.disconnect('changed::commands-enabled');

        extensionSettings = null;
    }

    if (gnomeSettings !== null) {
        gnomeSettings.disconnect('changed::gtk-theme');
        gnomeSettings = null;
    }

    if (shellSettings !== null) {
        shellSettings.disconnect('changed::name');
        shellSettings = null;
    }

    // Disable everything when the extension is disabled
    gtk.enabled = false;
    shell.enabled = false;
    command.enabled = false;
}


/**
 * This function is absolutely vital to the proper functioning of this
 * extension, and what it does is literally nothing
 */
function init() { }
