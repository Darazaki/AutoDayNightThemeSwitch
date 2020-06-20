//! The module that manages this whole extension
'use strict';


// Imports:
const { Base, Gtk, Nighttime, TimeCheck } = imports.modules;
const Me = ExtensionUtils.getCurrentExtension();
const { Gio } = imports.gi;


/**
 * Main extension module
 *
 * Contains, creates and manages the activation every other module
 */
class Module extends Base.Module {
    constructor() {
        super();

        // Public:

        /** Extension settings */
        this.settings = undefined;
        /** GTK Themes module */
        this.gtk = new GtkModule();
        /** Time check module */
        this.timeCheck = new TimeCheckModule(this.gtk);
        /** Nighttime module */
        this.nighttime = new NighttimeModule();
    }

    onEnabled() {
        let schema = Gio.SettingsSchemaSource.new_from_directory(
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

        // The GTK module is always enabled when the extension is enabled
        this.gtk.enabled = true;

        // Finally, check for nighttime
        this.nighttime.enabled = true;
        this.timeCheck.enabled = true;
    }

    onDisabled() {
        // Disable every module
        this.timeCheck.enabled = false;
        this.nighttime.enabled = false;
        this.gtk.enabled = false;

        // Free the memory
        this.settings.destroy();
        this.settings = undefined;
    }
}
