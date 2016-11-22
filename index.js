
import bluebird from 'bluebird'
import consoleStamp from 'console-stamp'
import child_process from 'child_process'
import uuid from 'uuid' 

import { getSingleton as initApp } from './app/app'

global.Promise = bluebird
global.Promise.onPossiblyUnhandledRejection((e) => { throw e; });

consoleStamp(console, 'yyyy/mm/dd HH:MM:ss.l')

initApp()
  .then((app) => {
    app.IPCToken = uuid.v4();
    child_process.fork(
      './background_tasks/resident.js',
      []
      //[],
      //{'stdio':['ignode','ignode','ignode','ipc']}
    ).send({'type':'IPC_token', 'data':app.IPCToken});

    app.logger.info(`Server initialization is complete`)
  })
  .catch((e) => {
    process.stderr.write(`FATAL ERROR\n`)
    process.stderr.write(`${e.message}\n`)
    process.stderr.write(`${e.stack}\n`)
    process.exit(1)
  })
