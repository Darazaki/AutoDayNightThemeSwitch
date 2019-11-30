'use strict';


// Imports:
const { Gio, Gtk } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


/**
 * This function is required to make this script work but doesn't do anything
 */
function init() { }


/**
 * Build an array of widgets for an entry row in the nighttime section
 * 
 * @param {string} title The row's title, it will be shown as a label
 * @param {string} settingsId The identifier used to identify the edited value
 * @param {Gio.Settings} settings The extension's settings
 *
 * @returns {Array<Gtk.Widget>} The array containing all the row's widgets
 */
function buildNighttimeRow(title, settingsId, settings) {
    // Title label
    
    let labelTitle = new Gtk.Label({
        label: title,
        visible: true,
    });
    
    // Spin entries

    let spinHours = new Gtk.SpinButton({
        visible: true,
        hexpand: true,
    });

    let spinMinutes = new Gtk.SpinButton({
        visible: true,
        hexpand: true,
    });

    let initialValue = settings.get_uint(settingsId);

    spinHours.set_range(0, 23 /* hours */ );
    spinHours.set_increments(1 /* hours */, 0);
    spinHours.set_value(Math.floor(initialValue / 60));
    spinHours.connect(
        'value-changed',
        (spinHours) => {
            settings.set_uint(settingsId,
                spinHours.get_value() * 60 + spinMinutes.get_value());
        },
    );

    spinMinutes.set_range(0, 59 /* minutes */ );
    spinMinutes.set_increments(15 /* minutes */, 0);
    spinMinutes.set_value(initialValue % 60);
    spinMinutes.connect(
        'value-changed',
        (spinMinutes) => {
            settings.set_uint(settingsId,
                spinHours.get_value() * 60 + spinMinutes.get_value());
        },
    );

    let labelSeparator = new Gtk.Label({
        label: 'h',
        visible: true,
    });

    return [labelTitle, spinHours, labelSeparator, spinMinutes];
}


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
    prefWidget.attach(titleThemes, 0, 0, 4, 1);

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
    prefWidget.attach(entryThemeDay, 1, 1, 3, 1);
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
    prefWidget.attach(entryThemeNight, 1, 2, 3, 1);
    settings.bind(
        'night-theme',
        entryThemeNight,
        'text',
        Gio.SettingsBindFlags.DEFAULT,
    );

    // SEPARATOR

    prefWidget.attach(new Gtk.HSeparator({
        visible: true,
    }), 0, 3, 4, 1);

    // NIGHTTIME HEADER

    let titleNighttime = new Gtk.Label({
        label: '<b>Nighttime (24h format)</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    prefWidget.attach(titleNighttime, 0, 4, 4, 1);

    // NIGHTTIME BEGIN

    let nighttimeRowBegin = buildNighttimeRow(
        'Start of Nighttime', 'nighttime-begin', settings);
    let nighttimeRowBeginLength = nighttimeRowBegin.length;
    for (let i = 0; i < nighttimeRowBeginLength; ++i) {
        prefWidget.attach(nighttimeRowBegin[i], i, 5, 1, 1);
    }

    // NIGHTTIME END

    let nighttimeRowEnd = buildNighttimeRow(
        'End of Nighttime', 'nighttime-end', settings);
    let nighttimeRowEndLength = nighttimeRowEnd.length;
    for (let i = 0; i < nighttimeRowEndLength; ++i) {
        prefWidget.attach(nighttimeRowEnd[i], i, 6, 1, 1);
    }


    return prefWidget;
}

