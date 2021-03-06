
import EventEmitter from 'events';
import {Events} from '../core';

class Scheduler extends EventEmitter {

	constructor(engine, config) {
        super();

        this.engine = engine;
        this.config = config;
        this.bufMgr = null;

        // remotePeerId -> dc
        this.peerMap = new Map();

        //本节点的bitfield
        this.bitset = new Set();

        //记录peers的每个buffer的总和，用于BT的rearest first策略  index -> count            
        this.bitCounts = new Map();
    }

    set bufferManager(bm) {
        this.bufMgr = bm;

        bm.on(Events.BM_LOST, sn => {
            //向peers广播已经不缓存的sn
            this._broadcastToPeers({
                event: Events.DC_LOST,
                sn: sn
            });
            this.bitset.delete(sn);
        })
    }

    updateLoadedSN(sn) {
    	// console.log("scheduler updateLoadedSN peerMap:",this.peerMap);
    	//在bitset中记录
        this.bitset.add(sn)
        if (this.bitCounts.has(sn)) {
        	//在bitCounts清除，防止重复下载
            this.bitCounts.delete(sn)
        }
        if (this.peerMap.size > 0) {
            const msg = {
                event: Events.DC_HAVE,
                sn: sn
            };
            this._broadcastToPeers(msg);
        }
    }

    updateLoadingSN(sn) {
    	//防止下载hls.js正在下载的sn                                                    
        this.loadingSN = sn;
    }

    updatePlaySN(sn) {
        //rearest first只用于vod
        const { logger } = this.engine;

    	logger.debug("scheduler updatePlaySN:", sn);
    	
        if (this.config.live) return;
        if (!this.hasPeers) return;
        let requested = [];
        for (let idx=sn+1;idx<=sn+this.config.urgentOffset+1;idx++) {
        	//如果这个块没有缓存并且peers有
            if (!this.bitset.has(idx) && idx !== this.loadingSN && this.bitCounts.has(idx)) {
            	//找到拥有这个块并且空闲的peer          
                for (let peer of this.peerMap.values()) {
                    if (peer.downloading === false && peer.bitset.has(idx)) {
                        peer.requestDataBySN(idx, true);
                        logger.debug(`request urgent ${idx} from peer ${peer.remotePeerId}`);
                        requested.push(idx);
                        break;
                    }
                }
            }
        }

        //检查是否有空闲的节点，有的话采用rearest first策略下载
        let idlePeers = this._getIdlePeer();

        //缓存溢出则停止rearest first
        if (idlePeers.length === 0 || this.bitCounts.size === 0 || this.bufMgr.overflowed) return;        
        let sortedArr = [...this.bitCounts.entries()].sort((item1, item2) => {
            return item1[1] < item2[1];
        });
        if (sortedArr.length === 0) return;

        //每次只下载一个rearest块
        let rearest = sortedArr.pop()[0];

        //排除掉loading的和requested的
        while (rearest === this.loadingSN || requested.includes(rearest)) {         
            if (sortedArr.length === 0) return;
            rearest = sortedArr.pop()[0];
        }
        for (let peer of idlePeers) {
            if (peer.bitset.has(rearest)) {
                peer.requestDataBySN(rearest, false);
                logger.debug(`request rearest ${rearest} from peer ${peer.remotePeerId}`);
                break;
            }
        }

    }

    _broadcastToPeers(msg) {
        for (let peer of this.peerMap.values()) {
            peer.sendJson(msg);
        }
    }

    addPeer(peer) {
        const { logger } = this.engine;
        logger.info(`add peer ${peer.remotePeerId}`);
        this.peerMap.set(peer.remotePeerId, peer);
        this.engine.emit('peers', [...this.peerMap.keys()]);
    }

    peersHasSN(sn) {
        return this.bitCounts.has(sn);
    }

    load(context, config, callbacks) {
        const { logger } = this.engine;
        this.context = context;
        const frag = context.frag;
        this.callbacks = callbacks;
        this.stats = {trequest: performance.now(), retry: 0, tfirst: 0, tload: 0, loaded: 0};
        this.criticalSeg = {sn: frag.sn, relurl: frag.relurl};

        let target;
        for (let peer of this.peerMap.values()) {
            logger.info("scheduler load", peer);
            if (peer.bitset.has(frag.sn)) {
                target = peer;
            }
        }

        if (target) {
            // target.requestDataBySN(frag.sn, true);
            target.requestDataByURL(frag.relurl, true); //critical的根据url请求
            logger.info(`request criticalSeg url ${frag.relurl} at ${frag.sn}`);
        }
        this.criticaltimeouter = window.setTimeout(this._criticaltimeout.bind(this), this.config.loadTimeout*1000);
    }

    handshakePeer(dc) {
        this._setupDC(dc);

        //向peer发送bitfield
        dc.sendBitField(Array.from(this.bitset));
    }

    _setupDC(dc){
        var _this = this;
        const { logger } = this.engine;
        dc.on(Events.DC_BITFIELD, msg => {
            if (!msg.field) return;
            let bitset = new Set(msg.field);
            dc.bitset = bitset;

            //防止重复下载
            msg.field.forEach( value => {
                if (!this.bitset.has(value)) {              
                    this._increBitCounts(value);
                }
            });
            //只有获取bitfield之后才加入peerMap
            this.addPeer(dc);
        })
        .on(Events.DC_HAVE, msg => {
            if (!msg.sn || !dc.bitset) return;
            const sn = msg.sn;
            dc.bitset.add(sn);
            if (!this.bitset.has(sn)) {
                //防止重复下载
                this._increBitCounts(sn);
            }
        })
        .on(Events.DC_LOST, msg => {
            if (!msg.sn || !dc.bitset) return;
            const sn = msg.sn;
            dc.bitset.delete(sn);
            this._decreBitCounts(sn);
        })
        .on(Events.DC_PIECE, msg => {                                                  //接收到piece事件，即二进制包头
            if (this.criticalSeg && this.criticalSeg.relurl === msg.url) {             //接收到critical的响应
                this.stats.tfirst = Math.max(performance.now(), this.stats.trequest);
            }
        })
        .on(Events.DC_PIECE_NOT_FOUND, msg => {
            if (this.criticalSeg && this.criticalSeg.relurl === msg.url) {              //接收到critical未找到的响应
                window.clearTimeout(this.criticaltimeouter);                            //清除定时器
                this.criticaltimeouter = null;
                this._criticaltimeout();                                                //触发超时，由xhr下载
            }
        })
        .on(Events.DC_RESPONSE, response => {                                            //接收到完整二进制数据

            if (this.criticalSeg && this.criticalSeg.relurl === response.url && this.criticaltimeouter) {
                logger.info(`receive criticalSeg url ${response.url}`);
                window.clearTimeout(this.criticaltimeouter);                             //清除定时器
                _this.criticaltimeouter = null;
                let stats = _this.stats;

                stats.tload = Math.max(stats.tfirst, performance.now());
                stats.loaded = stats.total = response.data.byteLength;
                _this.criticalSeg = null;

                //重要
                response.data = response.data.buffer;
                _this.callbacks.onSuccess(response, stats, this.context);
            } else {
                this.bufMgr.addBuffer(response.sn, response.url, response.data);
            }
            this.updateLoadedSN(response.sn);
           
        })
        .on(Events.DC_REQUEST, msg => {
            let url = '';
            //请求sn的request
            if (!msg.url) {
                url = this.bufMgr.getURLbySN(msg.sn);
            } else {
                //请求url的request
                url = msg.url;
            }
            if (url && this.bufMgr.hasSegOfURL(url)) {
                let seg = this.bufMgr.getSegByURL(url);
                
                logger.debug("发送数据 <- 接收到数据请求:",msg, seg, seg.relurl, seg.data);

                dc.sendBuffer(msg.sn, seg.relurl, seg.data);

                this.engine.fetcher.reportUploaded(seg.data.byteLength);
                this.engine.signaler.signalerWs.send({
                    action: "tranx",
                    to_peer_id: dc.remotePeerId
                })
            } else {

                dc.sendJson({
                    event: Events.DC_PIECE_NOT_FOUND,
                    url: url,
                    sn: msg.sn
                })
            }
        })
        .on(Events.DC_TIMEOUT, () => {
            logger.warn(`DC_TIMEOUT`);
        })
    }

    deletePeer(dc) {
        if (this.peerMap.has(dc.remotePeerId)) {
            dc.bitset.forEach( value => {
                this._decreBitCounts(value);
            });
            this.peerMap.delete(dc.remotePeerId);
        }
        this.engine.emit('peers', [...this.peerMap.keys()]);
    }

    addPeer(peer) {
        const { logger } = this.engine;
        logger.info(`add peer ${peer.remotePeerId}`);
        this.peerMap.set(peer.remotePeerId, peer);

        this.engine.emit('peers', [...this.peerMap.keys()]);
    }

    _decreBitCounts(index) {
        if (this.bitCounts.has(index)) {
            let last = this.bitCounts.get(index);
            // this.bitCounts.set(index, last-1);
            // if (this.bitCounts.get(index) === 0) {
            //     this.bitCounts.delete(index);
            // }
            if (last === 1) {
                this.bitCounts.delete(index);
            } else {
                this.bitCounts.set(index, last-1);
            }
        }
    }
    
    _increBitCounts(index) {
        if (!this.bitCounts.has(index)) {
            this.bitCounts.set(index, 1);
        } else {
            let last = this.bitCounts.get(index);
            this.bitCounts.set(index, last+1);
        }
    }

    _criticaltimeout() {
        const { logger } = this.engine;
        logger.warn(`_criticaltimeout`);
        this.criticalSeg = null;
        this.callbacks.onTimeout(this.stats, this.context, null);
        this.criticaltimeouter = null;
    }
}

export default Scheduler;