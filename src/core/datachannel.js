
import EventEmitter from 'events';
import ReconnectingWebSocket from 'reconnecting-websocket';
import SimplePeer from 'simple-peer';

import Events from './events';


class DataChannel extends EventEmitter {
	constructor(engine, localPeerId, remotePeerId, isInit, config) {
		super();

		this.engine = engine;
		this.channelId = isInit ? localPeerId + "-" + remotePeerId: remotePeerId + "-" + localPeerId,
		this.config = config;
		this.connected = false;
		this.remotePeerId = remotePeerId;

		this._datachannel = new SimplePeer({ 
			initiator: isInit,
			objectMode: true,
		});

		this._init(this._datachannel);
		return this;
	}

	_init(dc){

		let logger  = this.engine.logger;
		var _this = this;
		dc.on('error', function() {
			_this.emit(Events.DC_ERROR);
		});

		dc.on('signal', data=>{
			console.log(data);
			try{
				_this.emit(Events.DC_SIGNAL, data)
			}catch(e){
				console.log(e);
			}
			// _this.emit(Events.DC_SIGNAL, data)
		});


		var r = function() {
			// for (logger.info("datachannel CONNECTED to " + _this.remotePeerId), t.connected = true, t.emit(Events.DC_OPEN), t._sendPing(); t.msgQueue.length > 0;) {
			// 	var e = t.msgQueue.shift();
			// 	_this.emit(e.event, e);
			// }
		};
		dc.once("connect", function(){
			console.log(("datachannel CONNECTED to " + _this.remotePeerId));
		});

		// dc.on('stream', stream => {
		//     console.log("stream:",stream)
		// })


		// simPeer.on('data', data => {
		//   console.log('got a chunk', data);
		// })

	}

	receiveSignal(e) {
		console.log("接收数据【receiveSigna】:",e);
		this._datachannel.signal(e)
	}

}


export default DataChannel;