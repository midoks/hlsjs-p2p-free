
import EventEmitter from 'events';
import ReconnectingWebSocket from 'reconnecting-websocket';
import SimplePeer from 'simple-peer';

import Events from './events';


class DataChannel extends EventEmitter {
	constructor(engine, localPeerId, remotePeerId, isInit, config) {
		super();
		var simPeer =  require('simple-peer');

		this.engine = engine;
		this.channelId = isInit ? localPeerId + "-" + remotePeerId: remotePeerId + "-" + localPeerId,
		this.config = config;
		this.connected = false;
		this.remotePeerId = remotePeerId;
		this.delays = [];
		this.msgQueue = [];

		this._datachannel = new simPeer({ 
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

		dc.once("connect", function(){
			console.log(("datachannel CONNECTED to " + _this.remotePeerId));
			_this.connected = true;
			_this.emit(Events.DC_OPEN);
			for(_this._sendPing(); _this.msgQueue.length > 0;){
				var e = _this.msgQueue.shift();
				console.log(e);
				// _this.emit(e.event, e);
			}		
		});
	}

	_sendPing(){
		var _this = this;
		this.ping = performance.now();
		for (var t = 0; t < this.config.dcPings; t++){
			this.sendJson({event: Events.DC_PING});
		}
		window.setTimeout(function() {
			if (_this.delays.length > 0) {
				var t = 0,
				n = !0,
				r = !1,
				i = void 0;
				try {
					for (var o, a = _this.delays[Symbol.iterator](); ! (n = (o = a.next()).done); n = !0) {
						t += o.value
					}
				} catch(e) {
					r = !0,
					i = e
				} finally {
					try { ! n && a.
						return && a.
						return ()
					} finally {
						if (r) throw i
					}
				}
				_this.delay = t / e.delays.length;
				_this.delays = [];
			}
		},100)
	}

	sendBitField(data){
		console.log("sendBitField:",data);
		this.sendJson({
			event: Events.DC_BITFIELD,
			field: data
		})
	}

	sendJson(data){
		this.send(JSON.stringify(data))
	}

	send(data){
		this._datachannel && this._datachannel.connected && this._datachannel.send(data)
	}
	receiveSignal(e) {
		console.log("接收数据-receiveSignal:",e);
		this._datachannel.signal(e)
	}

}


export default DataChannel;