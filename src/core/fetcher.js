
import EventEmitter from 'events';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { Base64 } from 'js-base64';
import SimplePeer from 'simple-peer';

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


		console.log("channel:", engine);
		console.log("browserInfo:",browserInfo);
		console.log("announce:",announce);

		var simPeer = new SimplePeer({ 
			initiator: false,
			// sdpTransform: function (sdp) {
			// 	console.log(sdp);
			// 	return sdp;
			// }, 
		});

		simPeer.once('_iceComplete', function() {
			console.log('_iceComplete');
		});

		simPeer.on('signal', data=>{
			console.log('signal',data);
		});


		// simPeer.on('data', data => {
		//   console.log('got a chunk', data);
		// })

		console.log('Fetcher3',engine.config.wsSignalerAddr);
		// var wsUrl = p2p.config.wsSignalerAddr + "?id=" + peer
		// const rws = new ReconnectingWebSocket(wsUrl);
		// rws.addEventListener('open', () => {
		// 	console.log("websocket init");
		//     rws.send('{"action":"get_stat"}');
		// });

	}

	btAnnounce(){
		var announceURL = this.announce + '/channel';
		var urlChannel = urlBase64(this.engine.hlsjs.url)
		var postJson = {
			"channel": urlChannel,
		}
		var _this = this, logger = this.engine.logger;
		return new Promise(function(resolve, reject) {
			fetch(announceURL, {
				method: "POST",
				body: JSON.stringify(postJson)
			}).then(function(e) {
				return e.json()
			}).then(function(t) {
				this.peerId = t.peer_id;
				resolve(t);
			}).catch(function(e) {
				logger.error("[fetcher] btAnnounce error " + e);
				reject(e);
			})
		})
	} 

	channelStats(heartbeat,url){
		// setTimeout(function(){
		// 	Ajax("JSON",true).post(url ,'{}', function(data){
		// 		// console.log("channel[stats]:",data);
		// 	});

		// 	Fetcher.channelStats(heartbeat,url);
		// },heartbeat);
	}

	channelPeers(){
		console.log("channelPeers");
	}

}


export default Fetcher;