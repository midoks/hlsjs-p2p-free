import EventEmitter from 'events';

import {SignalWs,DataChannel,Events} from '../core';

import Scheduler from './scheduler';

class Tracker extends EventEmitter {
	constructor(engine, fetcher, config) {
		super();
		
		this.engine = engine;
        this.config = config;
        this.connected = false;
        this.scheduler = new Scheduler(engine, config);
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


        //debug
        // var hls = new Hls();
        // var videoSrc = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
        // hls.loadSource(videoSrc);
	}

     set currentPlaySN(sn) {
        this.scheduler.updatePlaySN(sn);
    }

    set currentLoadingSN(sn) {
        this.scheduler.updateLoadingSN(sn);
    }
    
    set currentLoadedSN(sn) {
        //更新bitmap
        this.scheduler.updateLoadedSN(sn);
    }

    _tryConnectToPeer() {
        const { logger } = this.engine;
        if (this.peers.length === 0) return;

        let plen = this.peers.length;
        for (var i = 0; i < plen; i++) {
            var remotePeerId = this.peers.pop().id;

            logger.info(`tryConnectToPeer ${remotePeerId}`);
            var datachannel = new DataChannel(this.engine, this.peerId, remotePeerId, true, this.config);

            //将对等端Id作为键
            this.DCMap.set(remotePeerId, datachannel);                                 
            this._setupDC(datachannel);
        }

    }

    _setupDC(datachannel) {
        var _this = this;
        const { logger } = this.engine;
        datachannel.on(Events.DC_SIGNAL, data => {
            const remotePeerId = datachannel.remotePeerId;
            logger.debug("remotePeerId:",remotePeerId);
            _this.signalerWs.sendSignal(remotePeerId, data);
            //启动定时器，如果指定时间对方没有响应则连接下一个
            if (!_this.signalTimer && !_this.failedDCSet.has(remotePeerId)) {
                _this.signalTimer = window.setTimeout(() => {
                    _this.DCMap.delete(remotePeerId);
                    //记录失败的连接
                    _this.failedDCSet.add(remotePeerId);              
                    logger.warn(`signaling ${remotePeerId} timeout`);
                    _this.signalTimer = null;
                    _this._tryConnectToPeer();
                }, 10000);
            }
        }).once(Events.DC_ERROR, () => {
                logger.warn(`datachannel error ${datachannel.channelId}`);
                this.scheduler.deletePeer(datachannel);
                this.DCMap.delete(datachannel.remotePeerId);
                this.failedDCSet.add(datachannel.remotePeerId);                  //记录失败的连接
                this._tryConnectToPeer();
                datachannel.destroy();

                this._requestMorePeers();

                //更新conns
                if (datachannel.isInitiator) {
                    if (datachannel.connected) {                       //连接断开
                        this.fetcher.decreConns();
                    } else {                                           //连接失败
                        this.fetcher.increFailConns();
                    }
                }
        }).once(Events.DC_OPEN, () => {
            logger.debug("连接成功!!! - Events.DC_OPEN");
            _this.scheduler.handshakePeer(datachannel);

            //如果dc数量不够则继续尝试连接
            if (_this.DCMap.size < _this.config.neighbours) {
                _this._tryConnectToPeer();
            }

            //更新conns
            _this.fetcher.increConns();
        })
    }

    _initSignalerWs() {
        const { logger } = this.engine;
        logger.debug("_initSignalerWs:",this.peerId);
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
		
        const { logger } = this.engine;
        var _this = this;

        logger.debug('Tracker resumeP2P');
       
        this.fetcher.btAnnounce().then(json => {
            logger.info(`announceURL response ${JSON.stringify(json)}`)
            _this.peerId = json.data.id;
            logger.identifier = _this.peerId;
            _this.fetcher.btHeartbeat(json.data.report_interval);

            _this.signalerWs = _this._initSignalerWs();  //连上tracker后开始连接信令服务器
            _this._handlePeers(json.data.peers);
            _this.engine.emit('peerId', _this.peerId);

            _this._requestMorePeers();
        }).catch(err => {
            // console.log(err);
        })

        
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
        var _this = this;
        var isHave = function(p){
            for (var i = 0; i < _this.peers.length; i++) {
                if (p.id == _this.peers[i].id){
                    return true;
                }
            }
            return false;
        }

        for(let peer of peers) {
            if (!isHave(peer)){
                this.peers.push({id: peer.id,});
            }
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

    _requestMorePeers() {
        const { logger } = this.engine;
        var _this = this;
        this.fetcher.btPPeers(3).then(json => {
            logger.info(`_requestMorePeers ${JSON.stringify(json)}`);
            _this._handlePeers(json.data.peers);
        });   
    }


	destroy() {
        window.clearInterval(this.heartbeater);
        this.heartbeater = null;
    }

}

export default Tracker;



