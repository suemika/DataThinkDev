g_aIframe = $("iframe");

$(function () {
	// 检查插件是否已经安装过
    var iRet = WebVideoCtrl.I_CheckPluginInstall();
	if (-2 == iRet) {
		alert("浏览器请切换到兼容模式");
		return;
	} else if (-1 == iRet) {
       alert("您还未安装过插件，双击开发包目录里的WebComponentsKit.exe安装！");
		return;
    }	

	// 关闭浏览器
	$(window).unload(function () {
		$.each(g_aIframe, function (i, oIframe) {
            getWebVideoCtrl(oIframe).I_Stop();
        });
	});
});

var iLoadedCount = 0;
function iframeLoaded() {
    iLoadedCount++;
	
		var oLiveView={};		
		
		if(iLoadedCount===1)		
			oLiveView = {
				iProtocol: 1,			// protocol 1：http, 2:https
				szIP: "192.168.10.212",	// protocol ip
				szPort: "80",			// protocol port
				szUsername: "admin",	// device username
				szPassword: "s123456h",	// device password
				iStreamType: 1,			// stream 1：main stream  2：sub-stream  3：third stream  4：transcode stream
				iChannelID:2,			// channel no
				bZeroChannel: false		// zero channel
			};
		
		if(iLoadedCount===2)		
			oLiveView = {
				iProtocol: 1,			// protocol 1：http, 2:https
				szIP: "192.168.10.212",	// protocol ip
				szPort: "80",			// protocol port
				szUsername: "admin",	// device username
				szPassword: "s123456h",	// device password
				iStreamType: 1,			// stream 1：main stream  2：sub-stream  3：third stream  4：transcode stream
				iChannelID: 4,			// channel no
				bZeroChannel: false		// zero channel
			};
			
		if(iLoadedCount===3)		
			oLiveView = {
				iProtocol: 1,			// protocol 1：http, 2:https
				szIP: "192.168.10.110",	// protocol ip
				szPort: "80",			// protocol port
				szUsername: "admin",	// device username
				szPassword: "12345",	// device password
				iStreamType: 1,			// stream 1：main stream  2：sub-stream  3：third stream  4：transcode stream
				iChannelID:33,			// channel no
				bZeroChannel: false		// zero channel
			};
			
		if(iLoadedCount===4)		
			oLiveView = {
				iProtocol: 1,			// protocol 1：http, 2:https
				szIP: "192.168.10.110",	// protocol ip
				szPort: "80",			// protocol port
				szUsername: "admin",	// device username
				szPassword: "12345",	// device password
				iStreamType: 1,			// stream 1：main stream  2：sub-stream  3：third stream  4：transcode stream
				iChannelID:2,			// channel no
				bZeroChannel: false		// zero channel
			};
			
        $.each(g_aIframe, function (i, oIframe) {
            var oWebVideoCtrl = getWebVideoCtrl(oIframe);
						
            // 登录设备
            oWebVideoCtrl.I_Login(oLiveView.szIP, oLiveView.iProtocol, oLiveView.szPort, oLiveView.szUsername, oLiveView.szPassword, {
                success: function (xmlDoc) {
                    // 开始预览
                    oWebVideoCtrl.I_StartRealPlay(oLiveView.szIP, {
                        iStreamType: oLiveView.iStreamType,
                        iChannelID: oLiveView.iChannelID,
                        bZeroChannel: oLiveView.bZeroChannel
                    });
                }
            });
        });
}

function getWebVideoCtrl(oIframe) {
    return oIframe.contentWindow.WebVideoCtrl;
}