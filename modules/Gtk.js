//! The module that handles the Gtk theme
'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { extension } = Me.imports.modules.Global;
const { Base } = Me.imports.modules;
const { Gio } = imports.gi;


/**
 * Day/Night GTK themes
 *
 * The main extension module `extension` is required to be defined before a
 * `GtkModule` can be created
 */
class Module extends Base.Module {
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
                this.night = extension.settings.get_string('night-theme');
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
        for (const id of this._signalIds) {
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
}
