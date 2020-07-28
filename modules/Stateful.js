//! A base module with some day/night state
'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { State } = Me.imports.modules.Global;
const { Base } = Me.imports.modules;


/** Something managed by this extension */
var Module = class Module extends Base.Module {
    constructor() {
        super();

        // Private:

        /** Current state */
        this._state = State.UNKNOWN;
    }

    /** Callback executed after state is changed to the day state */
    onDayStateSet() { }

    /** Callback executed after state is changed to the night state */
    onNightStateSet() { }

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

    set enabled(enabled) {
        super.enabled = enabled;

        if (!enabled) {
            // Reset the state since we can't know it after this module has been
            // disabled
            this._state = State.UNKNOWN;
        }
    }
};

