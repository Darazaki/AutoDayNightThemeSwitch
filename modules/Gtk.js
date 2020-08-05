//! The module that handles the Gtk theme
'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { Global, Stateful } = Me.imports.modules;
const { Gio } = imports.gi;


/**
 * Day/Night GTK themes
 *
 * The main extension module `extension` is required to be defined before a
 * `GtkModule` can be created
 */
var Module = class Module extends Stateful.Module {
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
        this.day = Global.extension.settings.get_string('day-theme');
        this.night = Global.extension.settings.get_string('night-theme');

        this.gtkSettings = new Gio.Settings({
            schema: 'org.gnome.desktop.interface',
        });

        if (Global.extension.firstTime) {
            this.firstTimeSetup();
        }

        // Apply the changes after the extension's preferences have been edited
        this._signalIds = [
            Global.extension.settings.connect('changed::day-theme', () => {
                this.day = Global.extension.settings.get_string('day-theme');
                if (this.state === Global.State.DAY) {
                    // It's daytime

                    // This will set the new theme after a certain amount of time
                    this.state = Global.State.UNKNOWN;
                }
            }),
            Global.extension.settings.connect('changed::night-theme', () => {
                this.night = Global.extension.settings.get_string('night-theme');
                if (this.state === Global.State.NIGHT) {
                    // It's nighttime

                    // This will set the new theme after a certain amount of time
                    this.state = Global.State.UNKNOWN;
                }
            }),
        ];

        // Update the extension's current GTK theme settings settings when the
        // GTK theme gets changed
        this._gtkSignalId = this.gtkSettings.connect('changed::gtk-theme', () => {
            const newTheme = this.gtkSettings.get_string('gtk-theme');

            if (Global.extension.timeCheck.isNighttime()) {
                if (newTheme !== this.night) {
                    Global.extension.settings.set_string('night-theme', newTheme);
                }
            } else if (newTheme !== this.day) {
                Global.extension.settings.set_string('day-theme', newTheme);
            }
        });
    }

    onDisabled() {
        // Disconnect signals
        for (const id of this._signalIds) {
            Global.extension.settings.disconnect(id);
        }

        this.gtkSettings.disconnect(this._gtkSignalId);

        // Free memory
        this.gtkSettings = undefined;
        this.day = undefined;
        this.night = undefined;
        this._gtkSignalId = undefined;
        this._signalId = undefined;
    }

    onDayStateSet() {
        this.setTheme(this.day);
    }

    onNightStateSet() {
        this.setTheme(this.night);
    }

    /**
     * Set the current GTK theme
     * 
     * @param {string} theme The theme's name
     */
    setTheme(theme) {
        this.gtkSettings.set_string('gtk-theme', theme);
    }

    /**
     * Initial configuration of the GTK module
     *
     * Skipped if the values set are already the default ones
     *
     * Must be called after `this.day`, `this.night` and `this.gtkSettings`
     * have been initialized
     */
    firstTimeSetup() {
        const settings = Global.extension.settings;

        const defaultDay = settings.get_default_value('day-theme').unpack();
        const defaultNight = settings.get_default_value('night-theme').unpack();
        if (this.day !== defaultDay || this.night !== defaultNight) {
            // The user already configured this part, skip the initial
            // configuration
            return;
        }

        const gtkTheme = this.gtkSettings.get_string('gtk-theme');

        // Day/night combinations for common themes
        switch (gtkTheme) {
            case 'Adwaita':
            case 'Adwaita-dark':
                this.day = 'Adwaita';
                this.night = 'Adwaita-dark';
                break;

            case 'Pop':
            case 'Pop-dark':
                this.day = 'Pop';
                this.night = 'Pop-dark';
                break;

            default:
                // Just use the current theme for both day and night
                this.day = this.night = gtkTheme;
        }

        // Write the new configuration into the preferences
        settings.set_string('day-theme', this.day);
        settings.set_string('night-theme', this.night);
    }
};

