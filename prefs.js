'use strict';


// Imports:
const { Gio, Gtk } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Config = imports.misc.config;
const Gettext = imports.gettext;


// Init translations
Gettext.textdomain('adnts@n.darazaki');
Gettext.bindtextdomain(
    'adnts@n.darazaki',
    Me.dir.get_child('locale').get_path(),
);
const _ = Gettext.gettext;


// `extensionManager` may not be available in the current version of GNOME Shell
// but it's necessary in order to change the shell theme
//
// `extensionManager` should be available on gnome-shell >= 3.34
const canChangeShellTheme = parseInt(Config.PACKAGE_VERSION.split('.')[1]) > 32;


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
    // ROW TITLE

    const labelTitle = new Gtk.Label({
        label: title,
        visible: true,
    });

    // ENTRIES

    const spinHours = new Gtk.SpinButton({
        visible: true,
        hexpand: true,
    });

    const spinMinutes = new Gtk.SpinButton({
        visible: true,
        hexpand: true,
    });

    // This is the value that's stored inside the settings at the moment the row
    // is being built
    // The `| 0` part is just here to make type checking easier but doesn't
    // actually do anything in that context (same goes with later uses)
    const initialValue = settings.get_uint(settingsId) | 0;

    // The range should be (min - step, max + step) in order to make a looping
    // spinner
    spinHours.set_range(-1, 24 /* hours */);
    spinHours.set_increments(1 /* hours */, 0);
    spinHours.set_value(Math.floor(initialValue / 60));
    spinHours.connect(
        'value-changed',
        (spinHours) => {
            let hours = spinHours.get_value() | 0;

            // In order to enable looping:
            // If the user tries incrementing the hours when it's already at its
            // highest value, set it to the lowest one instead
            // Also do the same with decrementing
            if (hours == 24) {
                hours = 0;
                spinHours.set_value(hours);
            } else if (hours == -1) {
                hours = 23;
                spinHours.set_value(hours);
            }

            settings.set_uint(settingsId,
                hours * 60 + spinMinutes.get_value());
        },
    );

    // Make it loop! (see `spinHours`'s documentation above)
    spinMinutes.set_range(-15, 74 /* minutes */);
    spinMinutes.set_increments(15 /* minutes */, 0);
    spinMinutes.set_value(initialValue % 60);
    spinMinutes.connect(
        'value-changed',
        (spinMinutes) => {
            let minutes = spinMinutes.get_value() | 0;
            let hours = spinHours.get_value() | 0;

            // In order to loop here, we have to change both the hours and the
            // minutes spinner (it wouldn't make any sense from a user's
            // perspective to not change the hours spinner)
            if (minutes > 59 /* max */) {
                // Increment hours by 1 and remove the hour from the minute
                // count
                minutes -= 60;
                ++hours;

                spinMinutes.set_value(minutes);
                spinHours.set_value(hours);
            } else if (minutes < 0 /* min */) {
                // Decrement hours by 1 and add the hour to the minute count
                minutes += 60;
                --hours;

                spinMinutes.set_value(minutes);
                spinHours.set_value(hours);
            }

            settings.set_uint(settingsId, hours * 60 + minutes);
        },
    );

    // HOURS/MINUTES SEPARATOR

    const labelSeparator = new Gtk.Label({
        label: ':',
        visible: true,
    });


    return [labelTitle, spinHours, labelSeparator, spinMinutes];
}


/**
 * Add a new tab to the `Gtk.Notebook`
 *
 * @param {Gtk.Notebook} notebook The previously created notebook
 * @param {string} name The tab's visible name
 * @param {Gtk.Widget} content The widget shown by this new page
 */
function appendPage(notebook, name, content) {
    const nameLabel = new Gtk.Label({
        label: name,
        visible: true,
    });

    notebook.append_page(content, nameLabel);
}


/**
 * @returns {Gtk.Grid} A grid widget with the default properties used here
 */
function buildDefaultGrid() {
    return new Gtk.Grid({
        margin_start: 18,
        margin_end: 18,
        margin_top: 18,
        margin_bottom: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
        hexpand: true,
        vexpand: true,
    });
}


/**
 * @param {Gio.Settings} settings This extension's settings
 *
 * @returns {Gtk.Widget} The "Time" page's content
 */
function buildTimePage(settings) {
    // Current grid's line
    let line = 0;
    const prefWidget = buildDefaultGrid();


    // NIGHTTIME HEADER

    const titleNighttime = new Gtk.Label({
        label: '<b>' + _('Nighttime (24h format)') + '</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    prefWidget.attach(titleNighttime, 0, line, 4, 1);

    ++line;

    // NIGHTTIME BEGIN

    const nighttimeRowBegin = buildNighttimeRow(
        _('Start of Nighttime'),
        'nighttime-begin',
        settings,
    );
    const nighttimeRowBeginLength = nighttimeRowBegin.length;
    for (let i = 0; i < nighttimeRowBeginLength; ++i) {
        prefWidget.attach(nighttimeRowBegin[i], i, line, 1, 1);
    }

    ++line;

    // NIGHTTIME END

    const nighttimeRowEnd = buildNighttimeRow(
        _('End of Nighttime'),
        'nighttime-end',
        settings,
    );
    const nighttimeRowEndLength = nighttimeRowEnd.length;
    for (let i = 0; i < nighttimeRowEndLength; ++i) {
        prefWidget.attach(nighttimeRowEnd[i], i, line, 1, 1);
    }

    ++line;

    // SEPARATOR

    prefWidget.attach(new Gtk.Separator({
        orientation: Gtk.Orientation.HORIZONTAL,
        visible: true,
    }), 0, line, 4, 1);

    ++line;

    // SAME AS NIGHT LIGHT

    const labelNightLight = new Gtk.Label({
        label: '<b>' + _('Use Night Light\'s Manual Schedule Instead') + '</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,

    });
    prefWidget.attach(labelNightLight, 0, line, 3, 1);
    const switchNightLight = new Gtk.Switch({
        active: settings.get_boolean('nighttime-from-night-light'),
        visible: true,
        halign: Gtk.Align.END,
    });
    prefWidget.attach(switchNightLight, 3, line, 1, 1);
    settings.bind(
        'nighttime-from-night-light',
        switchNightLight,
        'active',
        Gio.SettingsBindFlags.DEFAULT,
    );


    return prefWidget;
}


/**
 * @param {Gio.Settings} settings This extension's settings
 *
 * @returns {Gtk.Widget} The "Themes" page's content
 */
function buildThemesPage(settings) {
    // Current grid's line
    let line = 0;
    const prefWidget = buildDefaultGrid();


    // THEMES HEADER

    const titleThemes = new Gtk.Label({
        label: '<b>' + _('Day/Night GTK Themes') + '</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    prefWidget.attach(titleThemes, 0, line, 4, 1);

    ++line;

    // THEME DAY

    const labelThemeDay = new Gtk.Label({
        label: _('Day Theme'),
        visible: true,
    });
    prefWidget.attach(labelThemeDay, 0, line, 1, 1);

    const entryThemeDay = new Gtk.Entry({
        text: settings.get_string('day-theme'),
        visible: true,
        hexpand: true,
    });
    prefWidget.attach(entryThemeDay, 1, line, 3, 1);
    settings.bind(
        'day-theme',
        entryThemeDay,
        'text',
        Gio.SettingsBindFlags.DEFAULT,
    );

    ++line;

    // THEME NIGHT

    const labelThemeNight = new Gtk.Label({
        label: _('Night Theme'),
        visible: true,
    });
    prefWidget.attach(labelThemeNight, 0, line, 1, 1);

    const entryThemeNight = new Gtk.Entry({
        text: settings.get_string('night-theme'),
        visible: true,
        hexpand: true,
    });
    prefWidget.attach(entryThemeNight, 1, line, 3, 1);
    settings.bind(
        'night-theme',
        entryThemeNight,
        'text',
        Gio.SettingsBindFlags.DEFAULT,
    );

    // Don't show shell theme settings if they can't be used
    if (canChangeShellTheme) {
        ++line;

        // SEPARATOR

        prefWidget.attach(new Gtk.Separator({
            orientation: Gtk.Orientation.HORIZONTAL,
            visible: true,
        }), 0, line, 4, 1);

        ++line;

        // SHELL THEMES HEADER

        const titleShellThemes = new Gtk.Label({
            label: '<b>' + _('Day/Night Shell Themes') + '</b>',
            halign: Gtk.Align.START,
            use_markup: true,
            visible: true,
        });
        prefWidget.attach(titleShellThemes, 0, line, 3, 1);

        const switchShellTheme = new Gtk.Switch({
            active: settings.get_boolean('shell-enabled'),
            visible: true,
            halign: Gtk.Align.END,
        });
        prefWidget.attach(switchShellTheme, 3, line, 1, 1);
        settings.bind(
            'shell-enabled',
            switchShellTheme,
            'active',
            Gio.SettingsBindFlags.DEFAULT,
        );

        ++line;

        // SHELL THEME DAY

        const labelShellThemeDay = new Gtk.Label({
            label: _('Day Theme'),
            visible: true,
        });
        prefWidget.attach(labelShellThemeDay, 0, line, 1, 1);

        const entryShellThemeDay = new Gtk.Entry({
            text: settings.get_string('day-shell'),
            visible: true,
            hexpand: true,
        });
        prefWidget.attach(entryShellThemeDay, 1, line, 3, 1);
        settings.bind(
            'day-shell',
            entryShellThemeDay,
            'text',
            Gio.SettingsBindFlags.DEFAULT,
        );

        ++line;

        // SHELL THEME NIGHT

        const labelShellThemeNight = new Gtk.Label({
            label: _('Night Theme'),
            visible: true,
        });
        prefWidget.attach(labelShellThemeNight, 0, line, 1, 1);

        const entryShellThemeNight = new Gtk.Entry({
            text: settings.get_string('night-shell'),
            visible: true,
            hexpand: true,
        });
        prefWidget.attach(entryShellThemeNight, 1, line, 3, 1);
        settings.bind(
            'night-shell',
            entryShellThemeNight,
            'text',
            Gio.SettingsBindFlags.DEFAULT,
        );
    }


    return prefWidget;
}


/**
 * @param {Gio.Settings} settings This extension's settings
 *
 * @returns {Gtk.Widget} The "Extra" page's content
 */
function buildExtraPage(settings) {
    // Current grid's line
    let line = 0;
    const prefWidget = buildDefaultGrid();


    // COMMANDS HEADER

    const titleCommands = new Gtk.Label({
        label: '<b>' + _('Day/Night Commands (executed with /bin/sh)') + '</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    prefWidget.attach(titleCommands, 0, line, 3, 1);

    const switchCommands = new Gtk.Switch({
        active: settings.get_boolean('commands-enabled'),
        visible: true,
        halign: Gtk.Align.END,
    });
    prefWidget.attach(switchCommands, 3, line, 1, 1);
    settings.bind(
        'commands-enabled',
        switchCommands,
        'active',
        Gio.SettingsBindFlags.DEFAULT,
    );

    ++line;

    // COMMAND DAY

    const labelCommandDay = new Gtk.Label({
        label: _('Day Command'),
        visible: true,
    });
    prefWidget.attach(labelCommandDay, 0, line, 1, 1);

    const entryCommandDay = new Gtk.Entry({
        text: settings.get_string('day-command'),
        visible: true,
        hexpand: true,
    });
    prefWidget.attach(entryCommandDay, 1, line, 3, 1);
    settings.bind(
        'day-command',
        entryCommandDay,
        'text',
        Gio.SettingsBindFlags.DEFAULT,
    );

    ++line;

    // COMMAND NIGHT

    const labelCommandNight = new Gtk.Label({
        label: _('Night Command'),
        visible: true,
    });
    prefWidget.attach(labelCommandNight, 0, line, 1, 1);

    const entryCommandNight = new Gtk.Entry({
        text: settings.get_string('night-command'),
        visible: true,
        hexpand: true,
    });
    prefWidget.attach(entryCommandNight, 1, line, 3, 1);
    settings.bind(
        'night-command',
        entryCommandNight,
        'text',
        Gio.SettingsBindFlags.DEFAULT,
    );


    return prefWidget;
}


/**
 * @param {Gio.Settings} settings This extension's settings
 *
 * @returns {Gtk.Widget} The "Advanced" page's content
 */
function buildAdvancedPage(settings) {
    // Current grid's line
    let line = 0;
    const prefWidget = buildDefaultGrid();


    // ADVANCED HEADER

    const titleAdvanced = new Gtk.Label({
        label: '<b>' + _('Advanced') + '</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    prefWidget.attach(titleAdvanced, 0, line, 4, 1);

    ++line;

    // TIME CHECK PERIOD

    const labelCheckPeriod = new Gtk.Label({
        label: _('Time Check Period (in ms)'),
        visible: true,
    });
    prefWidget.attach(labelCheckPeriod, 0, line, 1, 1);

    const spinCheckPeriod = new Gtk.SpinButton({
        visible: true,
        hexpand: true,
    });
    // Range = [10ms, 30min]
    spinCheckPeriod.set_range(10 /* ms */, 1800000 /* ms */);
    spinCheckPeriod.set_increments(10 /* ms */, 0);
    spinCheckPeriod.set_value(settings.get_uint('time-check-period'));
    spinCheckPeriod.connect(
        'value-changed',
        (spinCheckPeriod) => {
            settings.set_uint(
                'time-check-period',
                spinCheckPeriod.get_value(),
            );
        },
    );
    prefWidget.attach(spinCheckPeriod, 1, line, 3, 1);


    return prefWidget;
}



/**
 * Create the widget and bind its children to the actual values
 *
 * @returns {Gtk.Widget} The widget containing all the other widgets
 */
function buildPrefsWidget() {
    const schema = Gio.SettingsSchemaSource.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false,
    );

    const settings = new Gio.Settings({
        settings_schema: schema.lookup(
            'org.gnome.shell.extensions.adnts@n.darazaki',
            true,
        ),
    });

    const prefWidget = new Gtk.Notebook({
        visible: true,
    });


    // Create and append all the pages
    appendPage(prefWidget, _("Time"), buildTimePage(settings));
    appendPage(prefWidget, _("Themes"), buildThemesPage(settings));
    appendPage(prefWidget, _("Extra"), buildExtraPage(settings));
    appendPage(prefWidget, _("Advanced"), buildAdvancedPage(settings));


    return prefWidget;
}

