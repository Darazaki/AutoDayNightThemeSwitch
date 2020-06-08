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


/** Something managed by this extension */
class Module {
    constructor() {
        // Private:
        this._state = State.UNKNOWN;
        this._enabled = false;
    }

    /**
     * Callback executed after a state has been set
     * 
     * @param {State} _state The new state
    */
    onSetState(_state) { }

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
        if (this._state !== state) {
            this._state = state;
            this.onSetState(state);
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
    }

    onEnabled() {
        this.day = extension.settings.get_string('day-theme');
        this.night = extension.settings.get_string('night-theme');
        
        extension.settings.connect('changed::day-theme', () => {
            this.day = extension.settings.get_string('day-theme');
            if (this.state === State.DAY) {
                // It's daytime

                // This will set the new theme after a certain amount of time
                this.state = State.UNKNOWN;
            }
        });
        extension.settings.connect('changed::night-theme', () => {
            this.day = extension.settings.get_string('night-theme');
            if (this.state === State.NIGHT) {
                // It's nighttime

                // This will set the new theme after a certain amount of time
                this.state = State.UNKNOWN;
            }
        });

        this.gtkSettings = new Gio.Settings({
            schema: 'org.gnome.desktop.interface',
        });

        // Update the extension's current GTK theme settings settings when the
        // GTK theme gets changed
        this.gtkSettings.connect('changed::gtk-theme', () => {
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
        extension.settings.disconnect('changed::day-theme');
        extension.settings.disconnect('changed::night-theme');
        this.gtkSettings.disconnect('changed::gtk-theme');

        this.gtkSettings.destroy();
    }
}
