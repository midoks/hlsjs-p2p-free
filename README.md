# hlsjs-p2p-free


<link rel="stylesheet" type="text/css" href="node_modules/dplayer/dist/DPlayer.min.css" />
<script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js" type="text/javascript"></script>
<script src="node_modules/dplayer/dist/DPlayer.min.js" type="text/javascript"></script>
<div id="dplayer" style="width:500px;height:300px;"></div>
<script id="loadjs"></script>
<script>
$('#loadjs').attr('src','./dist/p2p.js?v='+(new Date()).getTime());
$('#loadjs').on('load', function(){

    const dp = new DPlayer({
        container: document.getElementById('dplayer'),
        screenshot: true,
        video: {
            url: 'https://v10.dious.cc/20211105/fqeY6Nt2/index.m3u8',
            type: 'customHls',
            customType: {
                'customHls': function (video, player) {
                    const hls = new Hls({
                        debug: true,
                        // Other hlsjsConfig options provided by hls.js
                        p2pConfig: {
                            live: true,        
                            // Other p2pConfig options provided by CDNBye http://www.cdnbye.com/en/
                        }
                    });
                    hls.loadSource(video.src);
                    hls.attachMedia(video);
                }
            }
        },
    });
    console.log(dp);
});
</script>