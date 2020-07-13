//! The base module every module extends
'use strict';


/** Something managed by this extension */
var Module = class Module {
    constructor() {
        // Private:

        /** If activated */
        this._enabled = false;
    }

    /** Callback executed before the extension gets enabled */
    onEnabled() { }

    /**
     * Callback executed after the extension gets disabled and before the state
     * is reset to `State.UNKNOWN`
     */
    onDisabled() { }

    get enabled() {
        return this._enabled;
    }

    set enabled(enabled) {
        if (this._enabled) {
            if (!enabled) {
                // Disable

                this._enabled = false;
                this.onDisabled();
            }
        } else if (enabled) {
            // Enable

            this.onEnabled();
            this._enabled = true;
        }
    }
};
