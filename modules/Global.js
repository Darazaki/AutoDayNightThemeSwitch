//! Globally available tools and definitions (not a module)
'use strict';


/** The main extension module (see: `Main.Module`) */
var extension;


/** The state of a module */
var State = {
    UNKNOWN: 0,
    DAY: 1,
    NIGHT: 2,
};


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
            null /* no extra data to pass */,
            null /* no error handler */,
        );
    } else {
        // Either commands are disabled so trying to run one should always fail
        // or there is no command to execute so it should also fail
        return false;
    }
}
