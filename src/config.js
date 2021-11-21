
//时间单位统一为秒
let defaultP2PConfig = {
    key: 'free',                                //连接tracker服务器的API key

    wsSignalerAddr: 'wss://gop2p.cachecha.com/ws', //信令服务器地址
    announce:'https://gop2p.cachecha.com',         
    wsMaxRetries: 3,                            //发送数据重试次数
    wsReconnectInterval: 5,                     //websocket重连时间间隔

    p2pEnabled: true,                           //是否开启P2P，默认true

    dcRequestTimeout: 3,                        //datachannel接收二进制数据的超时时间
    dcUploadTimeout: 3,                         //datachannel上传二进制数据的超时时间
    dcPings: 5,                                 //datachannel发送ping数据包的数量
    dcTolerance: 4,                             //请求超时或错误多少次淘汰该peer

    packetSize: 16*1024,                        //每次通过datachannel发送的包的大小
    maxBufSize: 1024*1024*100,                  //p2p缓存的最大数据量
    loadTimeout: 5,                             //p2p下载的超时时间

    enableLogUpload: false,                      //上传log到服务器，默认true
    logUploadAddr: "ws://127.0.0.1/trace",       //log上传地址
    logUploadLevel: 'warn',                      //log上传level，分为debug、info、warn、error、none，默认warn
    logLevel: 'none',                            //log的level，分为debug、info、warn、error、none，默认none

    //播放设置
    autoStartLoad: true,                        //是否自动下载
    lowLatencyMode:false,
    startFragPrefetch:true,
    maxBufferSize:60 * 1000 * 1000,             //以秒为单位的最大缓冲区长度

};

export default defaultP2PConfig;
