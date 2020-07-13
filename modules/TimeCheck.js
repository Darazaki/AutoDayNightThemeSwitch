//! The module that periodically set the modules' state according to the time
'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { Base, Global } = Me.imports.modules;
const MainLoop = imports.mainloop;


/**
 * Time check module
 *
 * Set the state of modules depending on the time of the day
 */
var Module = class Module extends Base.Module {
    /**
     * @param {Array<Base.Module>} modules Modules who's states are managed here
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
        this.period = Global.extension.settings.get_uint('time-check-period');

        this.applyCurrentState();
        this.startClock();

        this._signalId = Global.extension.settings.connect('changed::time-check-period', () => {
            this.period = Global.extension.settings.get_uint('time-check-period');

            this.stopClock();
            this.startClock();
        });
    }

    onDisabled() {
        // Stop the periodic background loop
        this.stopClock();

        // Stop watching for changes
        Global.extension.settings.disconnect(this._signalId);

        // Free memory (keep `this.modules` since it cannot be read again)
        this.period = undefined;
        this._id = undefined;
        this._signalId = undefined;
    }

    startClock() {
        this._id = MainLoop.timeout_add(
            this.period,
            () => {
                this.applyCurrentState();
                return true /* continue to check the time */;
            },
            null /* no extra data to be passed */,
        );
    }

    stopClock() {
        MainLoop.source_remove(this._id);
    }

    /** Apply current state to each module in `this.modules` */
    applyCurrentState() {
        // Current state
        const state = this.isNighttime() ? Global.State.NIGHT : Global.State.DAY;

        // Set current state for each module (disabled modules are ignored)
        for (const mod of this.modules) {
            mod.state = state;
        }
    }

    /**
     * Calculate if now is nighttime
     * 
     * @returns {boolean} Is it nighttime?
     */
    isNighttime() {
        const now = new Date();
        // Minutes elapsed since midnight
        const minutesInDay = now.getHours() * 60 + now.getMinutes();
        // Nighttime module
        const nighttime = Global.extension.nighttime;
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
};
