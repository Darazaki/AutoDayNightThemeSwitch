//! The module that handles changing the shell theme (GNOME Shell >= 3.34.0)
'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { Global, Stateful } = Me.imports.modules;
const { extensionManager } = imports.ui.main;
const { Gio } = imports.gi;


/**
 * The module that handles changing GNOME Shell's theme on `>= 3.34.0` versions
 * 
 * It also watches for shell theme changes 
 */
var Module = class Module extends Stateful.Module {
    constructor() {
        super();

        // Public:

        /** Day shell theme's name */
        this.day = undefined;
        /** Night shell theme's name */
        this.night = undefined;

        // Private:

        /** User Themes' settings */
        this._userThemesSettings = undefined;
        /** All connected extension settings signals' ids */
        this._signalIds = undefined;
        /** Connected User Themes settings signal's id */
        this._userThemesSignalId = undefined;
    }

    onEnabled() {
        // Check if the User Themes extension is installed by attempting to
        // access its settings and, if it isn't, return immediately
        this._userThemesSettings = this.newUserThemesSettings();
        if (this._userThemesSettings === undefined) {
            // Settings not found: User Themes not installed
            return;
        }

        const settings = Global.extension.settings;

        this.day = settings.get_string('day-shell');
        this.night = settings.get_string('night-shell');

        if (Global.extension.firstTime) {
            this.firstTimeSetup();
        }

        this._signalIds = [
            settings.connect('changed::day-shell', () => {
                this.day = settings.get_string('day-shell');

                if (this.state === Global.State.DAY) {
                    // Set the theme after a while
                    this.state = Global.State.UNKNOWN;
                }
            }),
            settings.connect('changed::night-shell', () => {
                this.night = settings.get_string('night-shell');

                if (this.state === Global.State.NIGHT) {
                    // Set the theme after a while
                    this.state = Global.State.UNKNOWN;
                }
            }),
        ];

        this._userThemesSignalId = this._userThemesSettings.connect(
            'changed::name',
            () => {
                const newTheme = this._userThemesSettings.get_string('name');

                // Replace the existing theme name in the settings according to
                // the current state
                switch (this.state) {
                    case Global.State.DAY:
                        // Prevent the different theme changed signals from
                        // calling each other recusively
                        if (this.day !== newTheme) {
                            settings.set_string('day-shell', newTheme);
                        }
                        break;
                    case Global.State.NIGHT:
                        // Same as above
                        if (this.night !== newTheme) {
                            settings.set_string('night-shell', newTheme);
                        }
                        break;
                    default:
                        // If there's no known state then it either means:
                        //
                        // - that the user was already editing the theme in the
                        //   settings so it shouldn't be replaced; or
                        // - that the user has just enabled the "shell theme"
                        //   part of this extension while setting the shell
                        //   theme (which is very unlikely)
                        //
                        // So, in doubt, it should be ignored
                        break;
                }
            },
        );
    }

    onDisabled() {
        // It's possible nothing was initialized, in that case
        // `this._userThemesSettings` will be undefined
        if (this._userThemesSettings === undefined) {
            // Nothing to do
            return;
        }

        const extensionSettings = Global.extension.settings;

        // Disconnect signals
        this._userThemesSettings.disconnect(this._userThemesSignalId);
        for (const id of this._signalIds) {
            extensionSettings.disconnect(id);
        }

        // Free the memory
        this._userThemesSettings = undefined;
        this._userThemesSignalId = undefined;
        this._signalIds = undefined;
        this.night = undefined;
        this.day = undefined;
    }

    onDayStateSet() {
        this.setTheme(this.day);
    }

    onNightStateSet() {
        this.setTheme(this.night);
    }

    /**
     * Set a new Shell theme through User Themes
     * 
     * @param {string} name The new theme's name 
     */
    setTheme(name) {
        // Check if initialization failed and re-attempt it just in case
        if (this._userThemesSettings === undefined) {
            this.onEnabled();

            if (this._userThemesSettings === undefined) {
                // Failed again, let's fail silently and try again later
                this.state = Global.State.UNKNOWN;
                return;
            }
        }

        this._userThemesSettings.set_string('name', name);
    }

    /**
     * Create a new `Gio.Settings` object that points to User Themes' settings
     * if found, else returns undefined
     * 
     * @returns {Gio.Settings | undefined} User Themes' settings
     */
    newUserThemesSettings() {
        // Lookup the User Themes extension
        const extension = extensionManager.lookup(
            'user-theme@gnome-shell-extensions.gcampax.github.com',
        );
        if (extension === undefined) {
            // User Themes not installed

            return /* undefined */;
        }

        const schemaDir = extension.dir.get_child('schemas');

        let schema;
        if (schemaDir.query_exists(null)) {
            schema = Gio.SettingsSchemaSource.new_from_directory(
                schemaDir.get_path(),
                Gio.SettingsSchemaSource.get_default(),
                false /* non-trusted ("gschemas.compiled" might be corrupted) */,
            );
        } else {
            schema = Gio.SettingsSchemaSource.get_default();
        }

        return new Gio.Settings({
            settings_schema: schema.lookup(
                'org.gnome.shell.extensions.user-theme',
                true /* recursive lookup */,
            ),
        });
    }

    /**
     * Initial configuration for the Shell module
     *
     * Automatically skipped if the default configuration has already been made
     *
     * Must be called after initialization of:
     *
     * - `this.day`
     * - `this.night`
     * - `this._userThemesSettings`
     */
    firstTimeSetup() {
        const settings = Global.extension.settings;

        const defaultDay = settings.get_default_value('day-shell').unpack();
        const defaultNight = settings.get_default_value('night-shell').unpack();
        if (this.day !== defaultDay || this.night !== defaultNight) {
            // This module's value have already been changed (aka. configured),
            // skip initial configuration
            return;
        }

        // Use the current theme as for both day and night
        this.day = this.night = this._userThemesSettings.get_string('name');

        // Actually change the settings
        settings.set_string('day-shell', this.day);
        settings.set_string('night-shell', this.night);
    }
};

