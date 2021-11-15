
import EventEmitter from 'events';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { Base64 } from 'js-base64';
import Peer from 'simple-peer';

import Ajax from './ajax';



function urlBase64(url){
	var url = url.replace("http://","");
	url = url.replace("https://","");
	url = url.replace(".m3u8","");
	url = Base64.encode(url);
	return url
}


class Fetcher extends EventEmitter {
	constructor(p2p, key, channel, announce, browserInfo) {
		super();

		this.p2p = p2p;
		this.key = key;
		this.channel = channel;
		this.announce = announce;
		this.browserInfo = browserInfo;


		console.log("channel:", p2p);
		console.log("browserInfo:",browserInfo);
		console.log("announce:",announce);

		var urlChannel = urlBase64(p2p.hlsjs.url)
		var postJson = {
			"channel": urlChannel,
		}

		var channelPostUrl = announce + '/channel'
		Ajax("JSON",true).post(channelPostUrl ,JSON.stringify(postJson), function(data){
			console.log("channel[data]:",data);

			var report_interval = data.data['report_interval']*1000;
			var peer = data.data['id'];


			const peer2peer = new Peer({ initiator: true });

			console.log("peer2peer:",peer2peer);




			//开始心跳
			var url = announce+"/channel/"+urlChannel+"/node/"+peer+"/stats"
			Fetcher.channelStats(report_interval, url);
		});


		// console.log('Fetcher3',p2p.config.wsSignalerAddr);
		// const ReconnectingWebSocket = require('reconnecting-websocket');
		// const rws = new ReconnectingWebSocket(p2p.config.wsSignalerAddr);
		// rws.addEventListener('open', () => {
		//     rws.send('{"action":"get_stat"}');
		// });
	}

	static channelStats(heartbeat,url){
		setTimeout(function(){
			Ajax("JSON",true).post(url ,'{}', function(data){
				// console.log("channel[stats]:",data);
			});

			Fetcher.channelStats(heartbeat,url);
		},heartbeat);
	}

	channelPeers(){
		console.log("channelPeers");
	}

}


export default Fetcher;