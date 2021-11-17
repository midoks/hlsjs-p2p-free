

import EventEmitter from 'events';
import UAParser from 'ua-parser-js';

import Logger from './utils/logger';
import defaultP2PConfig from './config';
import {Fetcher,getBrowserRTC} from './core';
import Tracker from './bt';


const uaParserResult = (new UAParser()).getResult();

class p2p extends EventEmitter {

	constructor(hlsjs, p2pConfig) {

        super();

        this.config = Object.assign({}, defaultP2PConfig, p2pConfig);
        this.hlsjs = hlsjs;

         //默认开启P2P
        this.p2pEnabled = this.config.disableP2P === false ? false : true;             
        hlsjs.config.currLoaded = hlsjs.config.currPlay = 0;
        
        const onLevelLoaded = (event, data) => {

        	console.log('onLevelLoaded',event, data);

            const isLive = data.details.live;
            this.config.live = isLive;
            let channel = hlsjs.url.split('?')[0];

            //初始化logger
            let logger = new Logger(this.config, channel);
            this.hlsjs.config.logger = this.logger = logger;

            // try{
            //     this._init(channel);
            // }catch(e){
            //     console.log(e);
            // }
            this._init(channel);
            hlsjs.off(hlsjs.constructor.Events.LEVEL_LOADED, onLevelLoaded);
        };

        hlsjs.on(hlsjs.constructor.Events.LEVEL_LOADED, onLevelLoaded);
    }

     _init(channel) {
     	console.log('_init',channel);
        const { logger } = this;
        //上传浏览器信息
        let browserInfo = {
            browser: uaParserResult.browser.name,
            device: uaParserResult.device.type === 'mobile' ? 'mobile' : 'PC',
            os: uaParserResult.os.name
        };

        this.hlsjs.config.p2pEnabled = this.p2pEnabled;
        //实例化BufferManager
        // this.bufMgr = new BufferManager(this, this.config);
        // this.hlsjs.config.bufMgr = this.bufMgr;

        //实例化Fetcher
        let fetcher = new Fetcher(this, this.config.key, window.encodeURIComponent(channel), this.config.announce, browserInfo);
        this.fetcher = fetcher;    
        //实例化tracker服务器
        this.signaler = new Tracker(this, fetcher, this.config);
             
        // this.signaler.scheduler.bufferManager = this.bufMgr;
        // //替换fLoader
        // this.hlsjs.config.fLoader = FragLoader;
        // //向fLoader导入scheduler
        // this.hlsjs.config.scheduler = this.signaler.scheduler;
        // //在fLoader中使用fetcher
        // this.hlsjs.config.fetcher = fetcher;


        this.hlsjs.on(this.hlsjs.constructor.Events.FRAG_LOADING, (id, data) => {
            // console.log('FRAG_LOADING: ' + JSON.stringify(data.frag));
            // console.log('FRAG_LOADING: ',data.frag);
            // logger.debug('FRAG_LOADING: ' + data.frag.sn);
            // this.signaler.currentLoadingSN = data.frag.sn;

        });


        //防止重复连接ws
        this.signalTried = false;                               
        this.hlsjs.on(this.hlsjs.constructor.Events.FRAG_LOADED, (id, data) => {

        	console.log(this.hlsjs.constructor.Events.FRAG_LOADED, data);
            //let sn = data.frag.sn;
            //this.hlsjs.config.currLoaded = sn;

            //用于BT算法
            //this.signaler.currentLoadedSN = sn;                                
            //this.hlsjs.config.currLoadedDuration = data.frag.duration;
            // let bitrate = Math.round(data.frag.stats.loaded*8/data.frag.duration);
            // console.log('bitrate:',bitrate);
            //&& !this.signaler.connected
            if (!this.signalTried  && this.config.p2pEnabled) {

                // this.signaler.scheduler.bitrate = bitrate;
                // logger.info(`FRAG_LOADED bitrate ${bitrate}`);

                this.signaler.resumeP2P();
                this.signalTried = true;
            }
            // this.streamingRate = (this.streamingRate*this.fragLoadedCounter + bitrate)/(++this.fragLoadedCounter);
            // this.signaler.scheduler.streamingRate = Math.floor(this.streamingRate);
            // if (!data.frag.loadByHTTP) {
            //     data.frag.loadByP2P = false;
            //     data.frag.loadByHTTP = true;
            // }
        });

        // this.hlsjs.on(this.hlsjs.constructor.Events.FRAG_CHANGED, (id, data) => {
        //     // log('FRAG_CHANGED: '+JSON.stringify(data.frag, null, 2));
        //     console.log('FRAG_CHANGED: '+data.frag.sn);
        //     const sn = data.frag.sn;
        //     this.hlsjs.config.currPlay = sn;
        //     // this.signaler.currentPlaySN = sn;
        // });

        // this.hlsjs.on(this.hlsjs.constructor.Events.ERROR, (event, data) => {
        //     logger.error(`errorType ${data.type} details ${data.details} errorFatal ${data.fatal}`);
        //     const errDetails = this.hlsjs.constructor.ErrorDetails;
        //     switch (data.details) {
        //         case errDetails.FRAG_LOAD_ERROR:
        //         case errDetails.FRAG_LOAD_TIMEOUT:
        //             this.fetcher.errsFragLoad ++;
        //             break;
        //         case errDetails.BUFFER_STALLED_ERROR:
        //             this.fetcher.errsBufStalled ++;
        //             break;
        //         case errDetails.INTERNAL_EXCEPTION:
        //             this.fetcher.errsInternalExpt ++;
        //             break;
        //         default:
        //     }
        // });

        this.hlsjs.on(this.hlsjs.constructor.Events.DESTROYING, () => {
            // log('DESTROYING: '+JSON.stringify(frag));
            this.signaler.destroy();
            this.signaler = null;
        });
    }


    //停止p2p
    disableP2P() {    
        console.log("disableP2P!!!!")
        // const { logger } = this;
        // logger.warn(`disableP2P`);
        // if (this.p2pEnabled) {
        //     this.p2pEnabled = false;
        //     this.config.p2pEnabled = this.hlsjs.config.p2pEnabled = this.p2pEnabled;
        //     if (this.signaler) {
        //         this.signaler.stopP2P();
        //     }
        // }
    }

    //在停止的情况下重新启动P2P
    enableP2P() {       
        console.log("enableP2P!!!!")
        // const { logger } = this;
        // logger.warn(`enableP2P`);
        // if (!this.p2pEnabled) {
        //     this.p2pEnabled = true;
        //     this.config.p2pEnabled = this.hlsjs.config.p2pEnabled = this.p2pEnabled;
        //     if (this.signaler) {
        //         this.signaler.resumeP2P();
        //     }
        // }
    }
}


p2p.WEBRTC_SUPPORT = !!getBrowserRTC();
p2p.version = "0.0.1";
export default p2p;


