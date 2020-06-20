//! The base module every module extends
'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { State } = Me.imports.modules.Global;


/** Something managed by this extension */
var Module = class Module {
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
};
