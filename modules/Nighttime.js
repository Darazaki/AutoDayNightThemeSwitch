//! The module indicating if now is nighttime
'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { extension } = Me.imports.modules.Global;
const { Base } = Me.imports.modules;


/**
 * Nighttime indication module
 *
 * Use the values in the extension's settings to describe if it's currently
 * nighttime
 */
class Module extends Base.Module {
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
        let settings = extension.settings;

        // Disconnect all the signals connected in `this.onEnabled`
        for (const id of this._signalIds) {
            settings.disconnect(id);
        }

        // Shouldn't free a whole lot of memory but still
        this._signalIds = undefined;
        this.begin = undefined;
        this.end = undefined;
    }
}
