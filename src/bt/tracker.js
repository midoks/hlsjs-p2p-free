import EventEmitter from 'events';

import {SignalWs} from '../core';

class Tracker extends EventEmitter {
	constructor(engine, fetcher, config) {
		super();
		
		this.engine = engine;
        this.config = config;
        this.connected = false;
        // this.scheduler = new BTScheduler(engine, config);
        this.DCMap = new Map();              //{key: remotePeerId, value: DataChannnel} 目前已经建立连接或正在建立连接的dc
        this.failedDCSet= new Set();         //{remotePeerId} 建立连接失败的dc
        this.signalerWs = null;              //信令服务器ws
        this.heartbeatInterval = 30;
        //tracker request API
        this.fetcher = fetcher;
        /*
        peers: Array<Object{id:string}>
         */
        this.peers = [];
	}

    _tryConnectToPeer() {
        const { logger } = this.engine;
        if (this.peers.length === 0) return;
        let remotePeerId = this.peers.pop().id;
        logger.info(`tryConnectToPeer ${remotePeerId}`);
        // let datachannel = new DataChannel(this.engine, this.peerId, remotePeerId, true, this.config);
        this.DCMap.set(remotePeerId, datachannel);                                  //将对等端Id作为键
        // this._setupDC(datachannel);
    }


    _initSignalerWs() {
        const { logger } = this.engine;
        let websocket = new SignalWs(this.engine, this.peerId, this.config);
        websocket.onopen = () => {
            this.connected = true;
            // this._tryConnectToPeer();
        };

        websocket.onmessage = (e) => {
            let msg = JSON.parse(e.data);
            let action = msg.action;
            switch (action) {
                case 'signal':
                    if (this.failedDCSet.has(msg.from_peer_id)) return;
                    logger.debug(`start handle signal of ${msg.from_peer_id}`);
                    window.clearTimeout(this.signalTimer);      //接收到信令后清除定时器
                    this.signalTimer = null;
                    if (!msg.data) {                            //如果对等端已不在线
                        this.DCMap.delete(msg.from_peer_id);
                        this.failedDCSet.add(msg.from_peer_id); //记录失败的连接
                        logger.info(`signaling ${msg.from_peer_id} not found`);
                        this._tryConnectToPeer();
                    } else {
                        this._handleSignal(msg.from_peer_id, msg.data);
                    }
                    break;
                case 'reject':
                    this.stopP2P();
                    break;
                default:
                    logger.warn('Signaler websocket unknown action ' + action);

            }

        };
        websocket.onclose = () => {    //websocket断开时清除datachannel
            this.connected = false;
            this.destroy();
        };
        return websocket;
    }

	resumeP2P(){
		console.log('Tracker resumeP2P');
        const { logger } = this.engine;
        try{
            this.fetcher.btAnnounce().then(json => {
                console.log('Tracker resumeP2P:',json);
                logger.info(`announceURL response ${JSON.stringify(json)}`)
                this.peerId = json.peer_id;
                logger.identifier = this.peerId;
                // this.fetcher.btHeartbeat(json.heartbeat_interval);
                // this.fetcher.btStatsStart(json.report_limit);
                this.signalerWs = this._initSignalerWs();  //连上tracker后开始连接信令服务器
                // this._handlePeers(json.peers);
                // this.engine.emit('peerId', this.peerId);
            }).catch(err => {

            })

        }catch(e){
            console.log(e)
        }
	}



	destroy() {
        window.clearInterval(this.heartbeater);
        this.heartbeater = null;
    }

}

export default Tracker;
