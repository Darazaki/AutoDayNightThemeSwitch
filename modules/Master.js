//! The module that manages this whole extension
'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { Base, Commands, Global, Gtk, Nighttime, Shell, TimeCheck } = Me.imports.modules;
const { Gio } = imports.gi;


/**
 * Master extension module
 *
 * Contains, creates and manages the activation every other module
 */
var Module = class Module extends Base.Module {
    constructor() {
        super();

        // Public:

        /** Extension settings */
        this.settings = undefined;
        /** GTK Themes module */
        this.gtk = new Gtk.Module();
        /** Command execution module */
        this.commands = new Commands.Module();
        /** Shell Themes module */
        this.shell = new Shell.Module();
        /** Time check module */
        this.timeCheck = new TimeCheck.Module(
            this.commands,
            this.gtk,
            this.shell,
        );
        /** Nighttime module */
        this.nighttime = new Nighttime.Module();

        // Private:

        /** All connected extension settings signals' ids */
        this._signalIds = undefined;
    }

    onEnabled() {
        const schema = Gio.SettingsSchemaSource.new_from_directory(
            Me.dir.get_child('schemas').get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false /* non-trusted ("gschemas.compiled" might be corrupted) */,
        );

        this.settings = new Gio.Settings({
            settings_schema: schema.lookup(
                'org.gnome.shell.extensions.adnts@n.darazaki',
                true /* recursively look for the schema */,
            ),
        });

        // Observe changes
        this._signalIds = [
            this.settings.connect('changed::commands-enabled', () => {
                this.commands.enabled = this.settings.get_boolean('commands-enabled');
            }),
        ];

        // The GTK module is always enabled when the extension is enabled
        this.gtk.enabled = true;

        // Optionally enable the command execution and shell theming modules
        this.commands.enabled = this.settings.get_boolean('commands-enabled');
        if (this.settings.get_boolean('shell-enabled')) {
            // `extensionManager` needs to be ready since the User Themes needs
            // to be loaded
            Global.extensionManagerReady().then(() => {
                this.shell.enabled = true;
            });
        }

        // Finally, check for nighttime
        this.nighttime.enabled = true;
        this.timeCheck.enabled = true;
    }

    onDisabled() {
        // Disconnect signals
        for (const id of this._signalIds) {
            this.settings.disconnect(id);
        }

        // Disable every module
        this.timeCheck.enabled = false;
        this.nighttime.enabled = false;
        this.commands.enabled = false;
        this.shell.enabled = false;
        this.gtk.enabled = false;

        // Free the memory
        this.settings.destroy();
        this.settings = undefined;
    }
};
