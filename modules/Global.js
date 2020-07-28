//! Globally available tools and definitions (not a module)
'use strict';


// Imports:
const { GLib } = imports.gi;
const { extensionManager } = imports.ui.main;


/** The main extension module (see: `Master.Module`) */
var extension;


/** The state of a module */
var State = {
    UNKNOWN: 0,
    DAY: 1,
    NIGHT: 2,
};


/**
 * `extensionManager`'s initialized state property name to access
 * 
 * - `undefined` => `extensionManager` or its init state doesn't exist
 * - some string => `extensionManager[managerInitializedName]` to get its state
 */
var managerInitializedName;

if (extensionManager) {
    // Extension manager exist, try to find its init state property name

    if (extensionManager._initted !== undefined) {
        managerInitializedName = '_initted';
    } else if (extensionManager._initialized !== undefined) {
        managerInitializedName = '_initialized';
    }
}


/**
 * Get a promise that waits for `extensionManager` to finish initializing
 * 
 * @returns {Promise<void>} The promised promise
 */
async function extensionManagerReady() {
    while (!extensionManager[managerInitializedName]) {
        // Allow GNOME Shell to do other things while waiting
        await undefined;
    }
}


/**
 * Run a command in the background using `/bin/sh -c 'COMMAND'`
 * 
 * @param {string} command The command to execute
 * 
 * @returns {boolean} If spawning the command succeeded
 */
function runCommand(command) {
    command = command.trim();

    if (command.length != 0) {
        return GLib.spawn_async(
            null /* inherit working directory */,
            ['/bin/sh', '-c', command],
            null /* inherit environment variables */,
            GLib.SpawnFlags.DEFAULT,
            null /* nothing to execute before */,
        )[0 /* -> could be spawned? */];
    } else {
        // Either commands are disabled so trying to run one should always fail
        // or there is no command to execute so it should also fail
        return false;
    }
}

