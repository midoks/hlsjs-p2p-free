
import EventEmitter from 'events';
import ReconnectingWebSocket from 'reconnecting-websocket';


class Fetcher extends EventEmitter {
	constructor(p2p, key, channel, announce, browserInfo) {
		super();

		this.p2p = p2p;
		this.key = key;
		this.channel = channel;
		this.announce = announce;
		this.browserInfo = browserInfo;

		// console.log("Fetcher3",p2p, key, channel, announce, browserInfo);
		console.log('Fetcher3',p2p.config.wsSignalerAddr);
		// const ReconnectingWebSocket = require('reconnecting-websocket');
		const rws = new ReconnectingWebSocket(p2p.config.wsSignalerAddr);
		rws.addEventListener('open', () => {
		    rws.send('hello!');
		});
	}

}


export default Fetcher;