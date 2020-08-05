//! The module indicating if now is nighttime based on Night Light
'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { Base, Global } = Me.imports.modules;
const { Gio } = imports.gi;


/**
 * Nighttime indication module
 *
 * Use the values in the extension's settings to describe if it's currently
 * nighttime
 */
var Module = class Module extends Base.Module {
    constructor() {
        super();

        // Public:

        /** Beginning of nighttime */
        this.begin = undefined;
        /** End of nighttime */
        this.end = undefined;

        // Private:

        /** Night Light's settings */
        this._nightlightSettings = undefined;
        /** Connected signals ids */
        this._signalIds = undefined;
    }

    onEnabled() {
        this._nightlightSettings = new Gio.Settings({
            schema: 'org.gnome.settings-daemon.plugins.color',
        });

        const settings = this._nightlightSettings;

        // Night Light store its time values in hours, not minutes => convert
        this.begin = settings.get_double('night-light-schedule-from') * 60;
        this.end = settings.get_double('night-light-schedule-to') * 60;

        // Watch for changes and collect signal ids
        this._signalIds = [
            settings.connect('changed::night-light-schedule-from', () => {
                this.begin = settings.get_double('night-light-schedule-from') * 60;
            }),
            settings.connect('changed::night-light-schedule-to', () => {
                this.end = settings.get_double('night-light-schedule-to') * 60;
            }),
        ];
    }

    onDisabled() {
        const settings = this._nightlightSettings;

        // Disconnect all the signals connected in `this.onEnabled`
        for (const id of this._signalIds) {
            settings.disconnect(id);
        }

        // Shouldn't free a whole lot of memory but still
        this._nightlightSettings = undefined;
        this._signalIds = undefined;
        this.begin = undefined;
        this.end = undefined;
    }
};

