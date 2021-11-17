// 文档地址
// https://hls-js.netlify.app/api-docs

console.log("start...");


import Hlsjs from 'hls.js';
import p2p from './p2p';

let recommendedHlsjsConfig = {
    maxBufferSize: 0,
    maxBufferLength: 30,
    liveSyncDuration: 30,
    fragLoadingTimeOut: 4000,              // used by fragment-loader
};

class P2PHlsjs extends Hlsjs {

    static get P2PEvents() {
        console.log("p2p:",P2PEngine.Events);
        return P2PEngine.Events;
    }

    static get uaParserResult() {
        return P2PEngine.uaParserResult;
    }

    constructor(config = {}) {

        console.log("p2p constructor:",config);

        let p2pConfig = config.p2pConfig || {};
        delete config.p2pConfig;

        let mergedHlsjsConfig = Object.assign({}, recommendedHlsjsConfig, config);

        //test
        mergedHlsjsConfig.debug = false;
        super(mergedHlsjsConfig);

        if (p2p.WEBRTC_SUPPORT) {
            this.engine = new p2p(this, p2pConfig);
        }
    }

    enableP2P() {
        this.engine.enableP2P();
    }

    disableP2P() {
        this.engine.disableP2P();
    }


}

P2PHlsjs.engineVersion = p2p.version;  

export default P2PHlsjs;