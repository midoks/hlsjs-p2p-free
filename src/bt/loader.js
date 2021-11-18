
import EventEmitter from 'events';


class FragLoader extends EventEmitter {
    constructor(config) {
        super();

        console.log("FragLoader init",config);
        this.logger = config.logger;
        // //denoted by sn
        this.currLoaded = config.currLoaded;

        //最新下载的块的时长
        this.currLoadedDuration = config.currLoadedDuration;    
        this.currPlay = config.currPlay;

        this.bufMgr = config.bufMgr;
        this.xhrLoader = new config.loader(config);
        this.p2pEnabled = config.p2pEnabled;
        this.scheduler = config.scheduler;
        this.fetcher = config.fetcher;

        console.log(this.xhrLoader);

        this.stats = this.xhrLoader.stats;
    }

    destroy() {
        // this.xhrLoader.abort();
    }

    abort() {
        // this.xhrLoader.abort();
    }

    /*
     首先从缓存中寻找请求的seg，如果缓存中找不到则用http请求。
     */
    load(context, config, callbacks) {
        console.log("loader:",context, config, callbacks);
        const { logger } = this;
        const frag = context.frag;
        //初始化flag
        frag.loadByP2P = false;                
        frag.loadByHTTP = false;


        try{
            if (this.bufMgr.hasSegOfURL(frag.relurl)) {  
             //如果命中缓存                                  
                logger.debug(`bufMgr found seg sn ${frag.sn} url ${frag.relurl}`);
                let seg = this.bufMgr.getSegByURL(frag.relurl);
                let response = { url : context.url, data : seg.data }, trequest, tfirst, tload, loaded, total;
                trequest = performance.now();
                tfirst = tload = trequest + 50;
                loaded = total = frag.loaded = seg.size;
                let stats={ trequest, tfirst, tload, loaded, total, retry: 0 };
                frag.loadByP2P = true;
                //必须是异步回调
                window.setTimeout(() => {                                                   
                    this.fetcher.reportFlow(stats, true);
                    callbacks.onSuccess(response, stats, context);
                }, 50)

             //如果在peers的bitmap中找到
            } else if (this.scheduler.peersHasSN(frag.sn)) {                            
                logger.info(`found sn ${frag.sn} from peers`);
                context.frag.loadByP2P = true;
                this.scheduler.load(context, config, callbacks);
                 //如果P2P下载超时则立即切换到xhr下载
                callbacks.onTimeout = (stats, context) => {                            
                    logger.debug(`xhrLoader load ${frag.relurl} at ${frag.sn}`);
                    frag.loadByP2P = false;
                    frag.loadByHTTP = true;
                    this.xhrLoader.load(context, config, callbacks);
                };
                const onSuccess = callbacks.onSuccess;
                //在onsucess回调中复制并缓存二进制数据
                callbacks.onSuccess = (response, stats, context) => {                       
                    if (!this.bufMgr.hasSegOfURL(frag.relurl)) {
                        this.bufMgr.copyAndAddBuffer(response.data, frag.relurl, frag.sn);
                    }
                    this.fetcher.reportFlow(stats, true);
                    frag.loaded = stats.loaded;
                    onSuccess(response,stats,context);
                };
            } else {
                logger.debug(`xhrLoader load ${frag.relurl} at ${frag.sn}`);
                context.frag.loadByHTTP = true;
                this.xhrLoader.load(context, config, callbacks);
                const onSuccess = callbacks.onSuccess;
                //在onsucess回调中复制并缓存二进制数据
                callbacks.onSuccess = (response, stats, context) => {                       
                    if (!this.bufMgr.hasSegOfURL(frag.relurl)) {
                        this.bufMgr.copyAndAddBuffer(response.data, frag.relurl, frag.sn);
                    }
                    this.fetcher.reportFlow(stats, false);
                    onSuccess(response,stats,context);
                };
            }

        }catch(e){
            console.log(e);
        }
    }


}


export default FragLoader;