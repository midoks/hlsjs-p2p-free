
import EventEmitter from 'events';
import ReconnectingWebSocket from 'reconnecting-websocket';
import SimplePeer from 'simple-peer';

import Events from './events';
import {Buffer} from 'buffer';


class DataChannel extends EventEmitter {
	constructor(engine, localPeerId, remotePeerId, isInit, config) {
		super();
		var simPeer =  require('simple-peer');

		this.engine = engine;
		this.channelId = isInit ? localPeerId + "-" + remotePeerId: remotePeerId + "-" + localPeerId,
		this.config = config;
		this.connected = false;
		this.localPeerId = localPeerId;
		this.remotePeerId = remotePeerId;
		this.delays = [];
		this.msgQueue = [];
		this.rcvdReqQueue = [];


		this._datachannel = new simPeer({ 
			initiator: isInit,
			objectMode: true,
		});

		this._init(this._datachannel);

		this.recordSended = this._adjustStreamingRate(10);
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

		dc.on("data",function(e) {
			console.log("接收数据[peer]:",e);
			if ("string" == typeof e) {
				logger.debug("datachannel receive string: " + e + "from " + _this.remotePeerId);
				var r = JSON.parse(e);
				if (!_this.connected) return void _this.msgQueue.push(r);
				switch (r.event) {
				case Events.DC_PONG:
					_this._handlePongMsg();
					break;
				case Events.DC_PING:
					_this.sendJson({
						event:Events.DC_PONG
					});
					break;
				case Events.DC_PIECE:
					_this._prepareForBinary(r.attachments, r.url, r.sn, r.size),
					_this.emit(r.event, r);
					break;
				case Events.DC_PIECE_NOT_FOUND:
					window.clearTimeout(t.requestTimeout),
					_this.requestTimeout = null,
					_this.emit(r.event, r);
					break;
				case Events.DC_REQUEST:
					_this._handleRequestMsg(r);
					break;
				case Events.DC_GRANT:
					_this._handleGrant(r);
					break;
				case Events.DC_PIECE_ACK:
					_this._handlePieceAck();
					break;
				default:
					_this.emit(r.event, r)
				}
			} else _this.bufArr.push(e),
			0 === --_this.remainAttachments && (window.clearTimeout(_this.requestTimeout), _this.requestTimeout = null, _this.sendJson({
				event: Events.DC_PIECE_ACK,
				sn: _this.bufSN,
				url: _this.bufUrl
			}), _this._handleBinaryData())
		});

		dc.once("close",function() {
			_this.emit(Events.DC_CLOSE)
		})
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
				_this.delay = t / _this.delays.length;
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
		if (this._datachannel && this._datachannel.connected) {
			this._datachannel.send(data)
		}
	}
	receiveSignal(e) {
		console.log("接收数据-receiveSignal:",e);
		this._datachannel.signal(e)
	}

	_handlePongMsg() {
		var e = performance.now() - this.ping;
		this.delays.push(e)
	}

	_prepareForBinary (e, t, n, r) {
		this.bufArr = [],
		this.remainAttachments = e,
		this.bufUrl = t,
		this.bufSN = n,
		this.expectedSize = r
	}

	_handleRequestMsg (e) {
		this.rcvdReqQueue.length > 0 ? e.urgent ? this.rcvdReqQueue.push(e.sn) : this.rcvdReqQueue.unshift(e.sn) : this.emit(Events.DC_REQUEST, e)
	}

	_handleGrant (e) {
		e.TTL > 0 && this.emit(Events.DC_GRANT, e)
	}

	_handlePieceAck() {

		if (this.uploading = !1, window.clearTimeout(this.uploadTimeout), this.uploadTimeout = null, this.rcvdReqQueue.length > 0) {
			var e = this.rcvdReqQueue.pop();
			console.log("_handlePieceAck:",e);
			this.emit(Events.DC_REQUEST, {
				sn: e
			})
		}
	}

	_handleBinaryData() {
		var e = Buffer.concat(this.bufArr);
		console.log("_handleBinaryData::",e, e.byteLength , this.expectedSize);
		e.byteLength == this.expectedSize && this.emit(Events.DC_RESPONSE, {
			url: this.bufUrl,
			sn: this.bufSN,
			data: e
		});
		this.bufUrl = "";
		this.bufArr = [];
		this.expectedSize = -1;
		this.downloading = false;
	}

	_loadtimeout () {
		var e = this.engine.logger;
		if (e.warn("datachannel timeout while downloading from " + this.remotePeerId), this.emit(Events.DC_TIMEOUT), this.requestTimeout = null, this.downloading = !1, ++this.miss >= this.config.dcTolerance) {
			var t = {
				event: Events.DC_CLOSE
			};
			this.sendJson(t),
			e.warn("datachannel download miss reach dcTolerance, close " + this.remotePeerId),
			this.emit(Events.DC_ERROR)
		}
	}

	requestDataByURL (e) {
		var t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1],
		n = {
			event: Events.DC_REQUEST,
			url: e,
			urgent: t
		};
		this.downloading = true,
		this.sendJson(n),
		t && (this.requestTimeout = window.setTimeout(this._loadtimeout.bind(this), 1e3 * this.config.dcRequestTimeout))
	}

	requestDataBySN (e) {
		var t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1],
		n = {
			event: Events.DC_REQUEST,
			sn: e,
			urgent: t
		};
		this.downloading = !0,
		this.sendJson(n),
		t && (this.requestTimeout = window.setTimeout(this._loadtimeout.bind(this), 1e3 * this.config.dcRequestTimeout))
	}

	_uploadtimeout () {
		this.engine.logger.warn("datachannel timeout while uploading to " + this.remotePeerId),
		this.uploading = false,
		this.rcvdReqQueue = []
	}

	_adjustStreamingRate(e) {
		var t = this,
		n = 0;
		return this.adjustSRInterval = window.setInterval(function() {
			t.streamingRate = Math.round(8 * n / e),
			n = 0
		},1e3 * e),
		function(e) {
			n += e
		}
	}

	sendBuffer (e, t, n) {
		this.uploading = !0,
		this.uploadTimeout = window.setTimeout(this._uploadtimeout.bind(this), 1e3 * this.config.dcUploadTimeout);
		var r = n.byteLength,
		i = this.config.packetSize,
		o = 0,
		a = 0;
		r % i == 0 ? a = r / i: (a = Math.floor(r / i) + 1, o = r % i);
		var u = {
			event: Events.DC_PIECE,
			attachments: a,
			url: t,
			sn: e,
			size: r
		};
		this.sendJson(u);
		for (var c = s(n, i, a, o), f = 0; f < c.length; f++) {
			this.send(c[f]);
		}
		this.recordSended(r)
	}
}

function s(e, t, n, r) {
	var i = [];
	if (r) {
		for (var o = void 0,
		a = 0; a < n - 1; a++) o = e.slice(a * t, (a + 1) * t),
		i.push(o);
		o = e.slice(e.byteLength - r, e.byteLength),
		i.push(o)
	} else for (var s = void 0,
	u = 0; u < n; u++) s = e.slice(u * t, (u + 1) * t),
	i.push(s);
	return i
}


export default DataChannel;