'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { Global, Master } = Me.imports.modules;


/** Called automatically when the extension is initialized */
function init() { }


/** Called automatically when the extension is enabled */
function enable() {
    // Delay the extension's initialization until it's enabled
    if (Global.extension === undefined) {
        Global.extension = new Master.Module();
    }

    Global.extension.enabled = true;
}


/** Called automatically when the extension is disabled */
function disable() {
    Global.extension.enabled = false;
}

