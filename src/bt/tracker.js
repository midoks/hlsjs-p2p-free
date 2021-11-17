import EventEmitter from 'events';

import {SignalWs,DataChannel,Events} from '../core';

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
        console.log('_tryConnectToPeer:::');
        const { logger } = this.engine;
        if (this.peers.length === 0) return;
        let remotePeerId = this.peers.pop().id;
        logger.info(`tryConnectToPeer ${remotePeerId}`);
        let datachannel = new DataChannel(this.engine, this.peerId, remotePeerId, true, this.config);

        //将对等端Id作为键
        this.DCMap.set(remotePeerId, datachannel);                                 
        this._setupDC(datachannel);
    }

    _setupDC(datachannel) {
        const { logger } = this.engine;
        datachannel.on(Events.DC_SIGNAL, data => {
            const remotePeerId = datachannel.remotePeerId;
            console.log("remotePeerId:",remotePeerId);
            this.signalerWs.sendSignal(remotePeerId, data);
            //启动定时器，如果指定时间对方没有响应则连接下一个
            if (!this.signalTimer && !this.failedDCSet.has(remotePeerId)) {
                this.signalTimer = window.setTimeout(() => {
                    this.DCMap.delete(remotePeerId);
                    //记录失败的连接
                    this.failedDCSet.add(remotePeerId);              
                    logger.warn(`signaling ${remotePeerId} timeout`);
                    this.signalTimer = null;
                    this._tryConnectToPeer();
                }, 10000);
            }
        });
    }

    _initSignalerWs() {
        const { logger } = this.engine;

        console.log("_initSignalerWs",this.peerId);
        let websocket = new SignalWs(this.engine, this.peerId, this.config);
        websocket.onopen = () => {
            this.connected = true;
            this._tryConnectToPeer();
        };

        websocket.onmessage = (e) => {
            let msg = JSON.parse(e.data);
            let action = msg.action;
            switch (action) {
                case 'signal':
                    if (this.failedDCSet.has(msg.from_peer_id)) return;
                    logger.debug(`start handle signal of ${msg.from_peer_id}`);
                    console.log(`start handle signal of ${msg.from_peer_id}`);
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
        var _this = this;
        try{
            this.fetcher.btAnnounce().then(json => {
                logger.info(`announceURL response ${JSON.stringify(json)}`)
                _this.peerId = json.data.id;
                logger.identifier = _this.peerId;
                this.fetcher.btHeartbeat(json.data.report_interval);
                // this.fetcher.btStatsStart(json.report_limit);
                this.signalerWs = this._initSignalerWs();  //连上tracker后开始连接信令服务器
                this._handlePeers(json.data.peers);
                // this.engine.emit('peerId', this.peerId);
            }).catch(err => {
                console.log(err);
            })

        }catch(e){
            console.log(e)
        }
	}

    _handleSignal(remotePeerId, data) {
        const { logger } = this.engine;
        let datachannel = this.DCMap.get(remotePeerId);
        if (datachannel && datachannel.connected) {
            logger.info(`datachannel had connected, signal ignored`);
            return
        }

        //收到子节点连接请求
        if (!datachannel) {
            logger.debug(`receive node ${remotePeerId} connection request`);
            if (this.failedDCSet.has(remotePeerId)) return;
            datachannel = new DataChannel(this.engine, this.peerId, remotePeerId, false, this.config);
            this.DCMap.set(remotePeerId, datachannel);                                  //将对等端Id作为键
            this._setupDC(datachannel);
        }
        datachannel.receiveSignal(data);
    }

    _handlePeers(peers) {
        for(let peer of peers) {
            this.peers.push({
                id: peer.id,
            })
        }
        //过滤掉已经连接的节点和连接失败的节点
        this.peers = this.peers.filter(node => {
            for (let peerId of [...this.DCMap.keys(),...this.failedDCSet.keys()]) {
                if (node.id === peerId) {
                    return false;
                }
            }
            return true;
        });
    }


	destroy() {
        window.clearInterval(this.heartbeater);
        this.heartbeater = null;
    }

}

export default Tracker;