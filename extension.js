'use strict';


// Imports:
const { GLib, Gio, GObject } = imports.gi;
const MainLoop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { extensionManager } = imports.ui.main;


/** The state of a module */
const State = {
    UNKNOWN: 0,
    DAY: 1,
    NIGHT: 2,
};


/** The main extension module (see: `MainModule`) */
let extension;


/**
 * Run a command in the background using `/bin/sh -c 'COMMAND'`
 * 
 * @param {string} command The command to execute
 * 
 * @returns {boolean} If spawning the command succeeded
 */
function runCommand(command) {
    command = command.trim();

    if (command.enabled && command.length != 0) {
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


/** Something managed by this extension */
class Module {
    constructor() {
        // Private:

        /** Current state */
        this._state = State.UNKNOWN;
        /** If activated */
        this._enabled = false;
    }

    /** Callback executed after state is changed to the day state */
    onDayStateSet() { }

    /** Callback executed after state is changed to the night state */
    onNightStateSet() { }

    /** Callback executed before the extension gets enabled */
    onEnabled() { }

    /**
     * Callback executed after the extension gets disabled and before the state
     * is reset to `State.UNKNOWN`
     */
    onDisabled() { }

    get state() {
        return this._state;
    }

    set state(state) {
        // A state can only be unknown if the module is disabled
        if (this._enabled && this._state !== state) {
            this._state = state;

            // Callback
            switch (state) {
                case State.DAY:
                    this.onDayStateSet();
                    break;
                case State.NIGHT:
                    this.onNightStateSet();
                    break;
                default:
                    // No callback for `State.UNKNOWN`
                    break;
            }
        }
    }

    get enabled() {
        return this._enabled;
    }

    set enabled(enabled) {
        if (this._enabled) {
            if (!enabled) {
                // Disable

                this._enabled = false;
                this.onDisabled();
                // Reset the state since we can't know it after this module has
                // been disabled
                this._state = State.UNKNOWN;
            }
        } else if (enabled) {
            // Enable

            this.onEnabled();
            this._enabled = true;
        }
    }
}


/**
 * Main extension module
 *
 * Contains, creates and manages the activation every other module
 */
class MainModule extends Module {
    constructor() {
        super();

        // Public:

        /** Extension settings */
        this.settings = undefined;
        /** GTK Themes module */
        this.gtk = new GtkModule();
        /** Time check module */
        this.timeCheck = new TimeCheckModule(this.gtk);
        /** Nighttime module */
        this.nighttime = new NighttimeModule();
    }

    onEnabled() {
        let schema = Gio.SettingsSchemaSource.new_from_directory(
            Me.dir.get_child('schemas').get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false /* non-trusted ("gschemas.compiled" might be corrupted) */,
        );

        this.settings = new Gio.Settings({
            settings_schema: schema.lookup(
                'org.gnome.shell.extensions.adnts@n.darazaki',
                true /* recursively look for the schema */,
            ),
        });

        // The GTK module is always enabled when the extension is enabled
        this.gtk.enabled = true;

        // Finally, check for nighttime
        this.nighttime.enabled = true;
        this.timeCheck.enabled = true;
    }

    onDisabled() {
        // Disable every module
        this.timeCheck.enabled = false;
        this.nighttime.enabled = false;
        this.gtk.enabled = false;

        // Free the memory
        this.settings.destroy();
        this.settings = undefined;
    }
}


/**
 * Nighttime indication module
 *
 * Use the values in the extension's settings to describe if it's currently
 * nighttime
 */
class NighttimeModule extends Module {
    constructor() {
        super();

        // Public:

        /** Beginning of nighttime */
        this.begin = undefined;
        /** End of nighttime */
        this.end = undefined;

        // Private:

        /** Connected signals id */
        this._signalIds = undefined;
    }

    onEnabled() {
        let settings = extension.settings;

        this.begin = settings.get_uint('nighttime-begin');
        this.end = settings.get_uint('nighttime-end');

        // Watch for changes and collect signal ids
        this._signalIds = [
            settings.connect('changed::nighttime-begin', () => {
                this.begin = settings.get_uint('nighttime-begin');
            }),
            settings.connect('changed::nighttime-end', () => {
                this.end = settings.get_uint('nighttime-end');
            }),
        ];
    }

    onDisabled() {
        // Disconnect all the signals connected in `this.onEnabled`
        for (let id of this._signalIds) {
            settings.disconnect(id);
        }

        // Shouldn't free a whole lot of memory but still
        this._signalIds = undefined;
        this.begin = undefined;
        this.end = undefined;
    }
}


/**
 * Time check module
 *
 * Set the state of modules depending on the time of the day
 */
class TimeCheckModule extends Module {
    /**
     * @param {Array<Module>} modules Modules who's states are managed here
     */
    constructor(...modules) {
        super();

        // Public:

        /** Modules who's states are managed here */
        this.modules = modules;
        /** Period at which the state of the day is updated */
        this.period = undefined;

        // Private:

        /** Time check module's main loop id */
        this._id = undefined;
        /** Signal id used to watch for changes */
        this._signalId = undefined;
    }

    onEnabled() {
        this.period = extension.settings.get_uint('time-check-period');

        this.applyCurrentState();
        this.startClock();

        this._signalId = extension.settings.connect('changed::time-check-period', () => {
            this.period = extension.settings.get_uint('time-check-period');

            this.stopClock();
            this.startClock();
        });
    }

    onDisabled() {
        // Stop the periodic background loop
        this.stopClock();

        // Stop watching for changes
        extension.settings.disconnect(this._signalId);

        // Free memory (keep `this.modules` since it cannot be read again)
        this.period = undefined;
        this._id = undefined;
        this._signalId = undefined;
    }

    startClock() {
        this._id = MainLoop.timeout_add(
            this.period,
            this.applyCurrentState,
            null /* no extra data to be passed */,
        );
    }

    stopClock() {
        MainLoop.source_remove(this._id);
    }

    /** Apply current state to each module in `this.modules` */
    applyCurrentState() {
        // Current state
        let state = this.isNighttime() ? State.NIGHT : State.DAY;

        // Set current state for each module (disabled modules are ignored)
        for (let mod of this.modules) {
            mod.state = state;
        }

        return true /* continue to check the time */;
    }

    /**
     * Calculate if now is nighttime
     * 
     * @returns {boolean} Is it nighttime?
     */
    isNighttime() {
        let now = new Date();
        // Minutes elapsed since midnight
        let minutesInDay = now.getHours() * 60 + now.getMinutes();
        // Is it nighttime?
        let result = false;
        // Nighttime module
        let nighttime = extension.nighttime;

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
}


/**
 * Day/Night GTK themes
 *
 * The main extension module `extension` is required to be defined before a
 * `GtkModule` can be created
 */
class GtkModule extends Module {
    constructor() {
        super();

        // Public:

        /** Day theme */
        this.day = undefined;
        /** Night theme */
        this.night = undefined;
        /** GTK GNOME Settings */
        this.gtkSettings = undefined;

        // Private:

        /** All connected extension settings signals' ids */
        this._signalIds = undefined;
        /** Connected GTK settings signal's id */
        this._gtkSignalId = undefined;
    }

    onEnabled() {
        this.day = extension.settings.get_string('day-theme');
        this.night = extension.settings.get_string('night-theme');

        this._signalIds = [
            extension.settings.connect('changed::day-theme', () => {
                this.day = extension.settings.get_string('day-theme');
                if (this.state === State.DAY) {
                    // It's daytime

                    // This will set the new theme after a certain amount of time
                    this.state = State.UNKNOWN;
                }
            }),
            extension.settings.connect('changed::night-theme', () => {
                this.day = extension.settings.get_string('night-theme');
                if (this.state === State.NIGHT) {
                    // It's nighttime

                    // This will set the new theme after a certain amount of time
                    this.state = State.UNKNOWN;
                }
            }),
        ];

        this.gtkSettings = new Gio.Settings({
            schema: 'org.gnome.desktop.interface',
        });

        // Update the extension's current GTK theme settings settings when the
        // GTK theme gets changed
        this._gtkSignalId = this.gtkSettings.connect('changed::gtk-theme', () => {
            let newTheme = this.gtkSettings.get_string('gtk-theme');

            if (extension.time.isNighttime()) {
                if (newTheme !== this.night) {
                    extension.settings.set_string('night-theme', newTheme);
                }
            } else if (newTheme !== this.day) {
                extension.settings.set_string('day-theme', newTheme);
            }
        });
    }

    onDisabled() {
        // Disconnect signals
        for (let id of this._signalIds) {
            this.extension.settings.disconnect(id);
        }

        this.gtkSettings.disconnect(this._gtkSignalId);

        // Free memory
        this.gtkSettings.destroy();
        this.gtkSettings = undefined;
        this.day = undefined;
        this.night = undefined;
        this._gtkSignalId = undefined;
        this._signalId = undefined;
    }
}


/** Called automatically when the extension is initialized */
function init() {
    extension = new MainModule();
}


/** Called automatically when the extension is enabled */
function enable() {
    extension.enabled = true;
}


/** Called automatically when the extension is disabled */
function disable() {
    extension.enabled = false;
}
