
const logTypes = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4,
};

const typesP = ['_debugP', '_infoP', '_warnP', '_errorP'];
const typesU = ['_debugU', '_infoU', '_warnU', '_errorU'];

class Logger {
    constructor(config, channel) {

        this.config = config;

        if (!(config.logLevel in logTypes)) config.logLevel = 'none';
        if (!(config.logUploadLevel in logTypes)) config.logUploadLevel = 'none';

        for (let i=0;i<logTypes[config.logUploadLevel];i++) {
            this[typesU[i]] = noop;
        }
    }

    debug(msg) {
        this._debugP(...arguments);
    }

    info(msg) {
        this._infoP(...arguments);
    }

    warn(msg) {
        this._warnP(...arguments);
    }

    error(msg) {
        this._errorP(...arguments);
    }

    _debugP(msg) {
        console.log(...arguments);
    }

    _infoP(msg) {
        console.info(...arguments);
    }

    _warnP(msg) {
        console.warn(...arguments);
    }

    _errorP(msg) {
        console.error(...arguments);
    }

}

function noop() {

}

export default Logger;