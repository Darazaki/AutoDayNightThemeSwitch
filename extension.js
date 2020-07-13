'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { Global, Master } = Me.imports.modules;


/** Called automatically when the extension is initialized */
function init() {
    Global.extension = new Master.Module();
}


/** Called automatically when the extension is enabled */
function enable() {
    Global.extension.enabled = true;
}


/** Called automatically when the extension is disabled */
function disable() {
    Global.extension.enabled = false;
}
