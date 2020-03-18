'use strict';


// Imports:
const { GLib, Gio, GObject } = imports.gi;
const MainLoop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


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


// VALUES TAKEN FROM SETTINGS (BEGIN)
// The following values do not have any impact on the program and are just there for
// type checking purpose

/** The period at which the time of the day is checked */
let timeCheckPeriod = 1 /* ms */;

/** Start and end of the nighttime */
const nighttime = {
    // Expressed in minutes since the start of the day

    /** Night begins, day ends */
    begin: 0 /* minutes */,
    /** Night ends, day begin */
    end: 0 /* minutes */
};

/** Day and night themes */
const theme = {
    /** Day theme's name */
    day: '',
    /** Night theme's name */
    night: ''
}
// VALUES TAKEN FROM SETTINGS (END)


/** Get the values from the settings and make it so they can be updated automatically */
function setupSettings() {
    // Get the GSchema source so we can lookup our settings
    let schema = Gio.SettingsSchemaSource.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false,
    );

    // Get the settings
    settings = new Gio.Settings({
        settings_schema: schema.lookup(
            'org.gnome.shell.extensions.adnts@n.darazaki', true)
    });

    // Read settings
    theme.day = settings.get_string('day-theme');
    theme.night = settings.get_string('night-theme');
    nighttime.begin = settings.get_uint('nighttime-begin');
    nighttime.end = settings.get_uint('nighttime-end');
    timeCheckPeriod = settings.get_uint('time-check-period');


    // Watch for changes


    // DAY THEME
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

    // NIGHT THEME
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

    // NIGHT TIME BEGIN
    settings.connect('changed::nighttime-begin', function () {
        // This it automatically updated so no need for extra tweaks
        nighttime.begin = settings.get_uint('nighttime-begin');
    });

    // NIGHT TIME END
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
}


/**
 * Set the default GTK theme to a new theme.
 * @param {string} themeName The new theme's name.
 */
function setGTKTheme(themeName) {
    // Some 'Theme'\ -> Some \'Theme\'\\
    themeName = themeName.replace(/[\\]/g, '\\\\').replace(/[\'']/g, '\\\'');

    // Exec: gsettings set org.gnome.desktop.interface gtk-theme 'My Awesome Theme'
    const cmdSetBase = 'gsettings set org.gnome.desktop.interface gtk-theme \'';
    GLib.spawn_command_line_async(cmdSetBase + themeName + '\'');
}


/** Set the GTK theme to the night theme if not already done */
function setNightThemeIfNeeded() {
    if (hasNightThemeBeenSet !== true) {
        // Either night theme or unknown

        hasNightThemeBeenSet = true;

        setGTKTheme(theme.night);
    }
}


/** Set the GTK theme to the day theme if not already done */
function setDayThemeIfNeeded() {
    if (hasNightThemeBeenSet !== false) {
        // Either day theme or unknown

        hasNightThemeBeenSet = false;

        setGTKTheme(theme.day);
    }
}


/**
 * Check if it is day or night time and set the theme accordingly if needed
 * 
 * @returns {boolean} true (which means repeat the loop indefinitely)
 */
function timeCheck() {
    let now = new Date();
    // Minutes elapsed since midnight
    let minutesInDay = now.getHours() * 60 + now.getMinutes();

    if (nighttime.begin < nighttime.end) {
        //   day (end)    night    day (begin)
        // +++++++++++++---------+++++++++++++++

        if (nighttime.begin <= minutesInDay && minutesInDay < nighttime.end) {
            // Night

            setNightThemeIfNeeded();
        } else {
            // Day

            setDayThemeIfNeeded();
        }
    } else /* if (nightTime.begin >= nightTime.end) */ {
        //  night (end)   day   night (begin)
        // -------------+++++++---------------

        if (nighttime.end <= minutesInDay && minutesInDay < nighttime.begin) {
            // Day

            setDayThemeIfNeeded();
        } else {
            // Night

            setNightThemeIfNeeded();
        }
    }

    return true /* repeat */;
}


/** Executed when the extension is enabled by the user or on session boot */
function enable() {
    // Initial setup for reading user preferences
    setupSettings();

    // Run now
    timeCheck();
    // Run every `timeCheckPeriod` starting from now
    timeCheckId = MainLoop.timeout_add(timeCheckPeriod, timeCheck, null);
}


/** Executed when the extension is disabled by the user or on session shutdown */
function disable() {
    // Remove the repeating check
    MainLoop.source_remove(timeCheckId);
}


/**
 * This function is absolutely vital to the proper functioning of this extension,
 * and what it does is literally nothing
 */
function init() { }
