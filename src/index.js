// 文档地址
// https://hls-js.netlify.app/api-docs

import Hlsjs from 'hls.js';
import p2p from './p2p';

let recommendedHlsjsConfig = {
    maxBufferSize: 600 * 1000 * 1000,
    maxBufferLength: 30,
    liveSyncDuration: 30,
    fragLoadingTimeOut: 4000,  // used by fragment-loader
};

class P2PHlsjs extends Hlsjs {

    static get P2PEvents() {
        return p2p.Events;
    }

    static get uaParserResult() {
        return p2p.uaParserResult;
    }

    constructor(config = {}) {
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