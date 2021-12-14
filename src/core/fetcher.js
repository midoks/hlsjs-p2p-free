
import EventEmitter from 'events';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { Base64 } from 'js-base64';

import { getBrowserRTC } from './index';


function urlBase64(url){
	var url = url.replace("http://","");
	url = url.replace("https://","");
	url = url.replace(".m3u8","");
	url = Base64.encode(url);
	return url
}


class Fetcher extends EventEmitter {
	constructor(engine, key, channel, announce, browserInfo) {
		super();

		this.engine = engine;
		this.key = key;
		this.channel = channel;
		this.announce = announce;
		this.browserInfo = browserInfo;
		this.conns = 0;
		
		this.channelVal = urlBase64(this.engine.hlsjs.url);

		this.announceURL = this.announce + '/channel';
		this.heartbeatURL = this.announceURL+'/'+this.channelVal+"/node/";

		this.totalHTTPDownloaded = 0;
		this.totalP2PDownloaded = 0;
		this.httpDownloaded = 0;
		this.p2pDownloaded = 0;
		this.totalP2PUploaded = 0;
	}

	btAnnounce(){
		var postJson = {
			"channel": this.channelVal,
		}
		var _this = this, logger = this.engine.logger;
		return new Promise(function(resolve, reject) {
			fetch(_this.announceURL, {
				method: "POST",
				body: JSON.stringify(postJson)
			}).then(function(e) {
				return e.json()
			}).then(function(t) {
				_this.peerId = t.data.id;
				resolve(t);
			}).catch(function(e) {
				logger.error("[fetcher] btAnnounce error " + e);
				reject(e);
			})
		})
	} 

	btHeartbeat(report_interval){
		var _this = this;
		var logger = this.engine.logger;
		this.heartbeater = window.setInterval(function() {
			fetch(_this.heartbeatURL+_this.peerId+"/stats",{
				method: "POST",
			}).then(function(e) {
			}).catch(function(e) {
				window.clearInterval(_this.heartbeater);
				logger.error("[fetcher] btHeartbeat error " + e);
			})
		},
		1e3 * report_interval)
	}

	btGetPeers(report_interval, callback){
		var _this = this;
		var logger = this.engine.logger;
		this.getPeers = window.setInterval(function() {
			fetch(_this.heartbeatURL+_this.peerId+"/peers",{
				method: "POST",
			}).then(function(e) {
				return e.json();
			}).then(function(t) {
				callback(t);
			}).catch(function(e) {
				window.clearInterval(_this.getPeers);
				logger.error("[fetcher] btGetPeers error: " + e);
			})
		},1e3 * report_interval);
	}

	btPPeers(){
		var _this = this, logger = this.engine.logger;
		return new Promise(function(resolve, reject) {
			fetch(_this.heartbeatURL+_this.peerId+"/peers", {
				method: "POST"
			}).then(function(e) {
				return e.json()
			}).then(function(t) {
				resolve(t);
			}).catch(function(e) {
				logger.error("[fetcher] btAnnounce error " + e);
				reject(e);
			})
		})
	} 


	reportUploaded(size){
		var n = Math.round(size / 1024);
		this.totalP2PUploaded += n;
        this._emitStats();
	}              

	//上报数据接口
	reportFlow(data,isP2P){
		var n = Math.round(data.total / 1024);

		if (isP2P) {
			this.p2pDownloaded += n;
			this.totalP2PDownloaded += n;
		} else {
			this.httpDownloaded += n;
			this.totalHTTPDownloaded += n;
		}
		this._emitStats();
	}

	_emitStats(){
		this.engine.emit("stats", {
			totalP2PDownloaded: this.totalP2PDownloaded,
			totalP2PUploaded:this.totalP2PUploaded,
		})
	}

	increConns() {
		this.conns++
	}

	decreConns(){
		this.conns++
	}
}


export default Fetcher;