'use strict';


// Imports:
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { extension } = Me.imports.modules.Global;
const { Main } = Me.imports.modules;


/** Called automatically when the extension is initialized */
function init() {
    extension = new Main.Module();
}


/** Called automatically when the extension is enabled */
function enable() {
    extension.enabled = true;
}


/** Called automatically when the extension is disabled */
function disable() {
    extension.enabled = false;
}
