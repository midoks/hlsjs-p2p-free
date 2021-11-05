// import wwws from './ws.js';
// import {sum,square} from './utils.js';
// console.log(sum(1,2));
console.log("start...");



import Hlsjs from 'hls.js';

let recommendedHlsjsConfig = {
    maxBufferSize: 0,
    maxBufferLength: 30,
    liveSyncDuration: 30,
    fragLoadingTimeOut: 4000,              // used by fragment-loader
};

class CDNByeHlsjs extends Hlsjs {

    static get P2PEvents() {
    	console.log(P2PEngine.Events);
        return P2PEngine.Events;
    }

    static get uaParserResult() {
        return P2PEngine.uaParserResult;
    }

    constructor(config = {}) {

    	console.log(config);

        let p2pConfig = config.p2pConfig || {};
        delete config.p2pConfig;

        let mergedHlsjsConfig = Object.assign({}, recommendedHlsjsConfig, config);

        super(mergedHlsjsConfig);

        // if (P2PEngine.WEBRTC_SUPPORT) {
        //     this.engine = new P2PEngine(this, p2pConfig);
        // }

    }

    enableP2P() {
        this.engine.enableP2P();
    }

    disableP2P() {
        this.engine.disableP2P();
    }


}

export default CDNByeHlsjs;