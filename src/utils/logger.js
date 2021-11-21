
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

        if (!(config.logLevel in logTypes)){
            config.logLevel = 'none';
        }

        if (config.debug){
            console.log("开始调试");
        } else {
             for (let i=0;i<logTypes[config.logLevel];i++) {
                this[typesP[i]] = noop;
            }
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
        console.log("P2P调试:",...arguments);
    }

    _infoP(msg) {
        console.info("P2P调试:",...arguments);
    }

    _warnP(msg) {
        console.warn("P2P调试:",...arguments);
    }

    _errorP(msg) {
        console.error("P2P调试:",...arguments);
    }

}

function noop() {}

export default Logger;