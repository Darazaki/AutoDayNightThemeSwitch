//! The module that handle the execution of arbitrary user commands
'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { Base, Global } = Me.imports.modules;


/**
 * Custom command execution module
 * 
 * Execution is done through the `Global.runCommand` function
 * 
 * Unlike other modules, changing the commands in the preferences won't trigger
 * a new execution on a day/night command edit since this could lead to
 * unfinished commands being executed
 */
var Module = class Module extends Base.Module {
    constructor() {
        super();

        // Public:

        /** Day command */
        this.day = undefined;
        /** Night command */
        this.night = undefined;

        // Private:

        /** All connected extension settings signals' ids */
        this._signalIds = undefined;
    }

    onEnabled() {
        const settings = Global.extension.settings;

        this.day = settings.get_string('day-command');
        this.night = settings.get_string('night-command');

        // Don't re-run the commands when they're edited, only store the edits
        this._signalIds = [
            settings.connect('changed::day-command', () => {
                this.day = settings.get_string('day-command');
            }),
            settings.connect('changed::night-command', () => {
                this.night = settings.get_string('night-command');
            }),
        ];
    }

    onDisabled() {
        const settings = Global.extension.settings;

        for (const id of this._signalIds) {
            settings.disconnect(id);
        }

        // Free memory:
        this.day = undefined;
        this.night = undefined;
        this._signalIds = undefined;
    }

    onDayStateSet() {
        Global.runCommand(this.day);
    }

    onNightStateSet() {
        Global.runCommand(this.night);
    }
}