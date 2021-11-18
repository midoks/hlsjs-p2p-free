
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

    updateLoadedSN(sn) {
    	console.log("scheduler updateLoadedSN peerMap:",this.peerMap);
    	console.log("scheduler updateLoadedSN:", sn);
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

    	console.log("scheduler updatePlaySN:", sn);
    	//rearest first只用于vod
        const { logger } = this.engine;
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

    peersHasSN(sn) {
        return this.bitCounts.has(sn);
    }

}

export default Scheduler;