'use strict';


// Imports:
const { Gio, Gtk } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


/**
 * This function is required to make this script work but doesn't do anything
 */
function init() { }


/** Create the widget and bind its children to the actual values
 *
 *  @returns {Gtk.Grid} The grid containing all the widgets
 */
function buildPrefsWidget() {
    const schema = Gio.SettingsSchemaSource.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false
    );

    let settings = new Gio.Settings({
        settings_schema: schema.lookup(
            'org.gnome.shell.extensions.adnts@n.darazaki.gmail.com', true)
    });

    let prefWidget = new Gtk.Grid({
        margin: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
        expand: true,
    });

    // THEMES HEADER

    let titleThemes = new Gtk.Label({
        label: '<b>Day/Night Themes</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    prefWidget.attach(titleThemes, 0, 0, 2, 1);

    // THEME DAY

    let labelThemeDay = new Gtk.Label({
        label: 'Day Theme',
        visible: true,
    });
    prefWidget.attach(labelThemeDay, 0, 1, 1, 1);

    let entryThemeDay = new Gtk.Entry({
        text: settings.get_string('day-theme'),
        visible: true,
        hexpand: true,
    });
    prefWidget.attach(entryThemeDay, 1, 1, 1, 1);
    settings.bind(
        'day-theme',
        entryThemeDay,
        'text',
        Gio.SettingsBindFlags.DEFAULT,
    );

    // THEME NIGHT

    let labelThemeNight = new Gtk.Label({
        label: 'Night Theme',
        visible: true,
    });
    prefWidget.attach(labelThemeNight, 0, 2, 1, 1);

    let entryThemeNight = new Gtk.Entry({
        text: settings.get_string('night-theme'),
        visible: true,
        hexpand: true,
    });
    prefWidget.attach(entryThemeNight, 1, 2, 1, 1);
    settings.bind(
        'night-theme',
        entryThemeNight,
        'text',
        Gio.SettingsBindFlags.DEFAULT,
    );

    // RESET THEMES

    let buttonResetThemes = new Gtk.Button({
        label: 'Reset Themes',
        visible: true,
        hexpand: true,
    });
    prefWidget.attach(buttonResetThemes, 0, 3, 2, 1);
    buttonResetThemes.connect('clicked', function() {
        // reset themes
    });

    // NIGHTTIME HEADER

    let titleNighttime = new Gtk.Label({
        label: '<b>Nighttime (expressed in minutes since midnight)</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    prefWidget.attach(titleNighttime, 0, 4, 2, 1);

    // NIGHTTIME BEGIN

    let labelNighttimeBegin = new Gtk.Label({
        label: 'Start of Nighttime',
        visible: true,
    });
    prefWidget.attach(labelNighttimeBegin, 0, 5, 1, 1);

    let spinNighttimeBegin = new Gtk.SpinButton({
        visible: true,
        hexpand: true,
    });
    spinNighttimeBegin.set_range(0, 1439);
    spinNighttimeBegin.set_increments(60, 0);
    spinNighttimeBegin.set_value(settings.get_uint('nighttime-begin'));
    spinNighttimeBegin.connect(
        'value-changed',
        (spinWidget) => {
            settings.set_uint('nighttime-begin', spinWidget.get_value());
        },
    );
    prefWidget.attach(spinNighttimeBegin, 1, 5, 1, 1);

    // NIGHTTIME END

    let labelNighttimeEnd = new Gtk.Label({
        label: 'End of Nighttime',
        visible: true,
    });
    prefWidget.attach(labelNighttimeEnd, 0, 6, 1, 1);

    let spinNighttimeEnd = new Gtk.SpinButton({
        visible: true,
        hexpand: true,
    });
    spinNighttimeEnd.set_range(0, 1439);
    spinNighttimeEnd.set_increments(60, 0);
    spinNighttimeEnd.set_value(settings.get_uint('nighttime-end'));
    spinNighttimeEnd.connect(
        'value-changed',
        (spinWidget) => {
            settings.set_uint('nighttime-end', spinWidget.get_value());
        },
    );
    prefWidget.attach(spinNighttimeEnd, 1, 6, 1, 1);

    // RESET NIGHTTIME

    let buttonResetNighttime = new Gtk.Button({
        label: 'Reset Nighttime',
        visible: true,
        hexpand: true,
    });
    prefWidget.attach(buttonResetNighttime, 0, 7, 2, 1);
    buttonResetNighttime.connect('clicked', function() {
        // reset nighttime
    });


    return prefWidget;
}

