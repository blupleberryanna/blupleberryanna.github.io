﻿const _open=1,_close=2,_high=3,_low=4,_vol=5,_amt=6;
var _dayopen=0, yClose=0;

function _setcolors(){
   var l=localStorage;
   function _setcolor(k,v){
	var s=document.styleSheets;
	for(var i=0;i<s.length;i++)
	   for(var j=0;j<s[i].cssRules.length;j++){
		if(s[i].cssRules[j].selectorText==k){
		    s[i].cssRules[j].style.color=v;
		    return;
		}
	   }
   }

   _setcolor(".upColor",l.upcolor||"rgb(238,21,21)");	//default red
   _setcolor(".lowColor",l.downcolor||"rgb(25,158,0)");	//default green
}

_setcolors();

function _latest(f) {
   if(!window.minutedata || minutedata.length==0) return 0;
   switch(f) {
	case _close:
		return minutedata[minutedata.length-1][f];
		break;
	case _open:
		return minutedata[_dayopen][f];
		break;
	case _vol:
	case _amt:
		for(var v=0,i=_dayopen; i<minutedata.length; i++) v+=minutedata[i][f];
		return v;
		break;
	case _high:
		for(var h=0,i=_dayopen; i<minutedata.length; i++) h<minutedata[i][f]&&(h=minutedata[i][f]);
		return h;
		break;
	case _low:
		for(var l=999999,i=_dayopen; i<minutedata.length; i++) l>minutedata[i][f]&&(l=minutedata[i][f]);
		return l;
		break;
   }
}

function _yclose(i) {
   if(window.minutedata) i = i || minutedata.length-1;
   if(!window.minutedata || i<0 || i>=minutedata.length) return 0;
   var yd,td=datetime(minutedata[i][0]).substr(0,8);
   for(var j=i-1; j>=0; j--) {
	yd=datetime(minutedata[j][0]).substr(0,8);
	if(yd<td) {_dayopen=j+1;return minutedata[j][_close];}
   }
   _dayopen=0;return minutedata[0][_open];
}

function _getprice(e) {
   localStorage.getprice=e.innerHTML;
}


//全局的环境变量
var JSEnvironment = {
    Symbol: '300782.sz', //股票代码
    //Symbol:'000001.sz',     //股票代码
    KLineIndex: [   //K线指标
        { Name: 'MA', Index: 'MA' },
        { Name: 'BOLL', Index: 'BOLL' },
        { Name: 'KDJ', Index: 'KDJ' },
        { Name: 'MACD', Index: 'MACD' },
        { Name: 'RSI', Index: 'RSI' },
        { Name: 'BRAR', Index: 'BRAR' },
        { Name: 'WR', Index: 'WR' },
        { Name: 'BIAS', Index: 'BIAS' },
        { Name: 'VOL', Index: 'VOL' }
    ],

    MinuteChart: null, //走势图
    MinuteOption: null,

    HistoryChart: null, //K线图
    HistoryOption: null,

    WidthPercent: 0.653,

    FiveDMinuteChart: null,
    FiveDMinuteOption: null,  //5日分时图选项

    StockCache: null, //股票数据
    CurrentNews: 0,
    CurrentInteract: 1,
    CurrentVisited: 2,
    CurrentNotice: 3,
    CurrentFlag: 1,
    JqTableInfo: $('<table class="tableInfo"></table>'),
//    JqUlOne: $('<ul class="ulOne"><li class="noRight">不复权</li><li class="noRight active">前复权</li><li class="noRight">后复权</li><ul>'),
    JqUlOne: $('<ul class="ulOne"><ul>'),
    JqUlTwo: $('<ul class="ulTwo"></ul>'),
    GetIndexByName: function (name) {
        for (var i in this.KLineIndex) {
            var item = this.KLineIndex[i];
            if (item.Name == name) return item.Index;
        }

        return null;
    },

    GetIndexName: function (index) {
        for (var i in this.KLineIndex) {
            var item = this.KLineIndex[i];
            if (item.Index == index) return item.Name;
        }

        return null;
    }
};

//本页面数据项
var pageData = new Map();


function tometric(n){
   if (typeof n!="number") return n;
   if (n < 10000)
       return n;
   else if (n < 1000000)
       return (n/1000).toFixed(2)+"K";
   else if (n < 1000000000)
       return (n/1000000).toFixed(2)+"M";
   else if (n < 1000000000000)
       return (n/1000000000).toFixed(2)+"B";
   else 
       return (n/1000000000000).toFixed(2)+"T";
}

function getURLParams(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) return decodeURI(r[2]);
    return null;
}

//数字金额转中文单位
function numToCUnit(num) {
if(num>=10) num=Math.round(num);
if(lang!="CN")return tometric(num);
    if (num < 100000000) {
        return Number(num / 10000).toFixed(2) + '万';
    } else {
        return Number(num / 100000000).toFixed(2) + '亿';
    }
}

//股票基础数据没有时，显示--
function baseDataFormat(data) {
    data.forEach(function (item, key, mapObj) {
        if (item == undefined) {
            if (key == 'riseRate' || key == 'exchange' || key == 'roe' || key == 'amplitude') {
                item = '--%';
            } else {
                item = '--';
            }
        } else {
            if (key == 'amount' || key == 'marketV' || key == 'flowMarketV' || key == 'vol') {
                item = numToCUnit(item);
//            } else if (key == 'riseRate' || key == 'exchange' || key == 'roe' || key == 'amplitude') {
} else if (key == 'riseRate' || key == 'roe' || key == 'amplitude') {
                item = Number(item).toFixed(2) + '%';
            } else {
                item = Number(item).toFixed(2);
            }
        }

        data.set(key, item);

    });
}

//与昨日收盘价相比，与0比
function baseDataColor(data, yClose) {
    data.forEach(function (item, key, mayobj) {
        if (item != undefined) {
            switch (key) {
                case 'exchange':
                    item = item.split('%')[0];
//                    setColor($(".change>span"), item, 0);
setColor($(".change>span"), item, yClose);
                    break;
                case 'roe':
                    item = item.split('%')[0];
                    setColor($(".exchangeInfoT .roe"), item, 0);
                    break;
                case 'rise':
                case 'riseRate':
                    item = item.split('%')[0];
                    setColor($(".riseInfo"), item, 0);
                    break;
                case 'price':
                    setColor($(".priceCurrentNum"), item, yClose);
                    break;
                case 'high':
                    setColor($(".high>span"), item, yClose);
                    break;
                case 'low':
                    setColor($(".low>span"), item, yClose);
                    break;
                case 'open':
                    setColor($(".open>span"), item, yClose);
                    break;
            }
        }

    });
}

//给元素设置特定颜色
function setColor(element, item, yClose) {
    if (item > yClose) {
        element.addClass('upColor').removeClass('lowColor');
    } else if (item < yClose) {
        element.addClass('lowColor').removeClass('upColor');
    } else {
        element.removeClass('upColor').removeClass('lowColor');
    }
}

//加载环境变量
function LoadEnvironment() {
    var symbol = getURLParams('symbol');
    if (symbol != null) JSEnvironment.Symbol = symbol;

    var strIndex = getURLParams('index');
    if (strIndex) {
        var aryIndex = strIndex.split(',');
        if (aryIndex.length > 0) JSEnvironment.KLineIndex = aryIndex;
    }
    //分钟走势图配置
    JSEnvironment.MinuteOption = {
        Type: '分钟走势图', //历史分钟走势图
        Symbol: JSEnvironment.Symbol,
        IsAutoUpdate: true, //是自动更新数据
        NetworkFilter:NetworkFilter,

        IsShowRightMenu: false, //右键菜单
        //IsShowCorssCursorInfo: false, //是否显示十字光标的刻度信息
        CorssCursorTouchEnd:true,
        EnableScrollUpDown:true,    //允许上下拖动图形
        CorssCursorInfo:{ Left:2, Right:2, Bottom:1, IsShowCorss:true},

        Border: //边框
        {
            Left: 1, //左边间距
            Right: 1, //右边间距
            Top: 20,
            Bottom: 20
        },

        MinuteTitle: //标题设置
        {
            IsShowName: false, //不显示股票名称
        },

        Frame: //子框架设置,刻度小数位数设置
        [
            { SplitCount: 5, StringFormat: 0 },
            { SplitCount: 3, StringFormat: 0 }
        ],
        ExtendChart:    //扩展图形
        [
            {Name:'MinuteTooltip' }  //手机端tooltip
        ],
    };
    JSEnvironment.FiveDMinuteOption = {
        Type: '分钟走势图',
        Symbol: JSEnvironment.Symbol,
        IsAutoUpdate: true, //是自动更新数据

        IsShowRightMenu: false, //右键菜单
        //IsShowCorssCursorInfo: false, //是否显示十字光标的刻度信息
        DayCount: 5,  //5日
        CorssCursorTouchEnd:true,
        EnableScrollUpDown:true,    //允许上下拖动图形
        NetworkFilter:NetworkFilter,

        Border: //边框
        {
            Left: 1, //左边间距
            Right: 1, //右边间距
            Top: 20,
            Bottom: 20
        },

        MinuteTitle: //标题设置
        {
            IsShowName: false, //不显示股票名称
        },

        Frame: //子框架设置,刻度小数位数设置
        [
            { SplitCount: 5, StringFormat: 1 },
            { SplitCount: 3, StringFormat: 1 }
        ],
        ExtendChart:    //扩展图形
        [
            {Name:'MinuteTooltip' }  //手机端tooltip
        ],
    };

    //K线图配置
    JSEnvironment.HistoryOption = {
        Type: '历史K线图',
        Windows: [
            { Index: "MA" },
            { Index: "VOL" },
            //{Index:"放心股-涨停多空线"},
            //{Index:"放心股-量能黄金点"},
        ], //窗口指标
        Symbol: JSEnvironment.Symbol,
        IsAutoUpdate: true, //是自动更新数据
        CorssCursorTouchEnd:true,
        NetworkFilter:NetworkFilter,

        IsShowRightMenu: false, //右键菜单
        EnableScrollUpDown:true,    //允许上下拖动图形
        DisableMouse:true,

        KLine: {
            DragMode: 1, //拖拽模式 0 禁止拖拽 1 数据拖拽 2 区间选择
            Right: 1, //复权 0 不复权 1 前复权 2 后复权
            Period: 0, //周期 0 日线 1 周线 2 月线 3 年线
            MaxReqeustDataCount: 1000, //日线数据最近1000天
            MaxRequestMinuteDayCount: 15,    //分钟数据最近15天
            PageSize: 50, //一屏显示多少数据
            IsShowTooltip: false //是否显示K线提示信息
        },

        KLineTitle: //标题设置
        {
            IsShowName: false, //不显示股票名称
            IsShowSettingInfo: false //不显示周期/复权
        },

        Border: //边框
        {
            Left: 0, //左边间距
            Right: 1, //右边间距
            Top: 20
        },

        Frame: //子框架设置
        [
            { SplitCount: 3, StringFormat: 0 },
            { SplitCount: 3, StringFormat: 0 },
            { SplitCount: 3, StringFormat: 0 },
            { SplitCount: 3, StringFormat: 0 }
        ],

        ExtendChart:    //扩展图形
        [
            {Name:'KLineTooltip' }  //手机端tooltip
        ],
    };

console.log(">>>>>>>>>>>>>>JSEnvironment",JSEnvironment,JSEnvironment.JqTableInfo);
}


//更新右边指标列表
function UpdateIndexListUI() {
    var items = "";
    for (var i in JSEnvironment.KLineIndex) {
        var item = JSEnvironment.KLineIndex[i].Name;
        items += "<li>" + item + "</li>";
    }
    JSEnvironment.JqUlTwo.append(items)
}

//重置画布
// $(window).resize(resizeCanvas);
//判断手机横竖屏状态：
function hengshuping() {
    if (window.orientation == 180 || window.orientation == 0) {
        console.log("竖屏状态！");
    }
    if (window.orientation == 90 || window.orientation == -90) {
        console.log("横屏状态！");
    }
}

function resizeCanvas() { //分钟走势图宽，高
    console.log("resize");
    var trueWidthM = document.getElementsByTagName('body')[0].clientWidth * JSEnvironment.WidthPercent;
    $("#minuteKline").width(Number(trueWidthM));
    $("#minuteKline").height(360);
    if (JSEnvironment.MinuteChart != null) {
        document.getElementById('minuteKline').JSChart.OnSize();
    }

    //K线图宽，高
    var trueWidth = document.getElementsByTagName('body')[0].clientWidth * 0.84;
    $("#kline").width(Number(trueWidth));
    $("#kline").height(360);
    if (JSEnvironment.HistoryChart != null) {
        document.getElementById('kline').JSChart.OnSize();
    }
}
//处理新闻
function UpdateNews(info, news) {
    var newsListStr = "";
    $.each(news.Data, function (index, value) {
        newsListStr += "<li>" +
            "<a>" +
            "<p class='title'>" + value.Title + "</p>" +
            "<p class='sourceInfo'><span class='source'>" + value.Source + "</span><span class='time'>" + (value.Releasedate.split(" "))[0].toString().substr(5, 5) + "</span></p>" +
            "</a>" +
            "<li>"
    });
    $(".newsList").html(newsListStr);
}

//时间字符串格式转化
function dateFormat(str, hasYear) { //eg:20181022
    if (str != 'undefined') {
        if (hasYear) {
            return str = str.substr(0, 4) + "&nbsp;-&nbsp;" + str.substr(4, 2) + "&nbsp;-&nbsp;" + str.substr(6, 2);
        } else {
            return str = str.substr(4, 2) + "&nbsp;-&nbsp;" + str.substr(6, 2);
        }

    }
}

function UpateInteracts(info, interacts) {
    var dataStr = "";
    $.each(interacts.Data, function (index, value) {

        dataStr += "<li>" +
            "<p class='qText'><span class='bgQA'>问</span>" + value.Title + "</p>" +
            "<p class='time'>提问人：<span class='author'>" + value.Author + "</span>提问时间：<span class='date'>" + dateFormat(value.Data, true) + "</span></p>" +
            "<p class='aText'><span class='bgQA'>答</span>" + value.Content + "</p>" +
            "<p class='time'>回答时间：<span class='date'>" + dateFormat(value.Data2, true) + "</span></p>" +
            "</li>";
    });
    $(".qAList").html(dataStr);
}

function UpdateNoticess(info, notices) {
    var noticesStr = "";
    $.each(notices.Data, function (index, value) {
        noticesStr += "<li>" +
            "<a>" +
            "<p class='title'>" + value.Title + "</p>" +
            "<p class='sourceInfo clear'><span class='time'>" + value.Data + "</span></p>" +
            "</a>" +
            "</li>";
    });
    $(".noticeList").html(noticesStr);
}

function UpdateMain(id, arySymbol, dataType, jsStock) {  //获得股票基础数据
    var read = jsStock.GetStockRead('main', UpdateMain); //获取一个读取数据类,并绑定id和更新数据方法
    var name = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.NAME);
    var date = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.DATE);
    var time = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.TIME);
    var price = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.PRICE);
    var riseFallPrice = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.RISE_FALL_PRICE);
    var increase = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.INCREASE);
    var high = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.HIGH);
    var low = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.LOW);
    var open = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.OPEN);
    var excahngerate = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.EXCHANGE_RATE);
    var amount = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.AMOUNT);
    var vol = read.Get(JSEnvironment.Symbol, 7);
    var pe = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.PE);
    var marketV = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.MARKET_VALUE);
    var flowMarketV = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.FLOW_MARKET_VALUE);
    var eps = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.FINANCE_PERSEARNING);
    var scrollEPS = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.FINANCE_EPS);
    var roe = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.ROE);
    var pb = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.PB);
    var amplitude = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.AMPLITUDE);
//    var yClose = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.YCLOSE);

/*
    pageData.set('price', price);
    pageData.set('rise', riseFallPrice);
    pageData.set('riseRate', increase);
    pageData.set('high', high);
    pageData.set('low', low);
    pageData.set('open', open);
    pageData.set('exchange', excahngerate);
    pageData.set('amount', amount);
    pageData.set('vol', vol);
*/
yClose=_yclose();
var tclose=_latest(_close);

pageData.set('price', tclose);
pageData.set('rise', tclose-yClose);
pageData.set('riseRate', (tclose-yClose)/yClose*100);
pageData.set('high', _latest(_high));
pageData.set('low', _latest(_low));
pageData.set('open', _latest(_open));
pageData.set('exchange', yClose);
pageData.set('amount', _latest(_amt));
pageData.set('vol', _latest(_vol));

    pageData.set('pe', pe);
    pageData.set('marketV', marketV);
    pageData.set('flowMarketV', flowMarketV);
    pageData.set('eps', eps);
    pageData.set('scrollEPS', scrollEPS);
    pageData.set('roe', roe);
    pageData.set('pb', pb);
    pageData.set('amplitude', amplitude);
    baseDataFormat(pageData);
    baseDataColor(pageData, yClose);
    $(".nameWrap .stockName").html(name);
    document.title = name;
    $(".exchangeInfo .date").html(dateFormat(String(date), false));
    var timeStr = String(time);
    if (timeStr.length == 5) {
        $(".exchangeInfo .time").html(timeStr.substring(0, 1) + "&nbsp;:&nbsp;" + timeStr.substring(1, 3) + "&nbsp;:&nbsp;" + timeStr.substring(3, 5));
    } else if (timeStr.length == 6) {
        $(".exchangeInfo .time").html(timeStr.substring(0, 2) + "&nbsp;:&nbsp;" + timeStr.substring(2, 4) + "&nbsp;:&nbsp;" + timeStr.substring(4, 6));
    }

    $(".priceCurrentNum").html(pageData.get('price'));
    $(".priceCurrent .riseNum").html(pageData.get('rise'));
    $(".priceCurrent .risePrecent").html(pageData.get('riseRate'));
    $(".priceHL .high>span").html(pageData.get('high'));
    $(".priceHL .low>span").html(pageData.get('low'));
    $(".priceOpen .open>span").html(pageData.get('open'));
    $(".priceOpen .change>span").html(pageData.get('exchange'));
    $(".priceAmount .num>span").html(pageData.get('amount').toFixed(4));
    $(".priceAmount .totalValue>span").html(pageData.get('vol').toFixed(4));
    $(".exchangeInfoT .pe").html(pageData.get('pe'));
    $(".exchangeInfoT .marketV").html(pageData.get('marketV'));
    $(".exchangeInfoT .flowMarketV").html(pageData.get('flowMarketV'));
    $(".exchangeInfoT .eps").html(pageData.get('eps'));
    $(".exchangeInfoT .scrollEPS").html(pageData.get('scrollEPS'));
    $(".exchangeInfoT .roe").html(pageData.get('roe'));
    $(".exchangeInfoT .pb").html(pageData.get('pb'));
    $(".exchangeInfoT .amplitude").html(pageData.get('amplitude'));
    read.EndRead();
}

function updateMinuteFive(id, arySymbol, dataType, jsStock) { //五档选项内容
    var read = jsStock.GetStockRead('minuteFive', updateMinuteFive); //获取一个读取数据类,并绑定id,和更新数据方法
    var buyData = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.BUY5);
    var sellData = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.SELL5);
//    var yClose = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.YCLOSE);

	function _color(price){
		if(price!="-"){
	            if (price > yClose) {
	                return "upColor";
        	    } else if (price < yClose) {
	                return "lowColor";
        	    } else {
	                return "symbolAve";
        	    }
		}
	}

	function _volfmt(vol){
vol=vol>=10?Math.round(vol):Number(Number(vol).toFixed(4));
if(lang!="CN")return tometric(vol);
		return (vol>=100000?vol>=100000000?Math.trunc(vol/100000000)+"亿":Math.trunc(vol/10000)+"万":vol)
	}

    read.EndRead();
    if (sellData && sellData.length == 5) {
        $(".tableOne").html("<tr><td>卖</td></tr>");
        for (var i in sellData) {
            var dataN = sellData[i];
//            var arr = lang?[translation["卖一"][transindex[lang]],translation["卖二"][transindex[lang]],translation["卖三"][transindex[lang]],translation["卖四"][transindex[lang]],translation["卖五"][transindex[lang]]]:["卖一", "卖二", "卖三", "卖四", "卖五"];
            var arr = ["1", "2", "3", "4", "5"];
            var tr1 = "<tr><td>" + arr[i] + "</td><td onclick='_getprice(this)' class='color-change "+_color(dataN.Price)+"'>" + (dataN.Price!="-"?dataN.Price.toFixed(2):dataN.Price) + "</td><td>" + (dataN.Vol!="-"?_volfmt(dataN.Vol):dataN.Vol) + "</td></tr>";
            $(".tableOne").prepend(tr1);
        }
    }
    if (buyData && buyData.length == 5) {
        $(".tableTwo").html("<tr><td>买</td></tr>");
        for (var i in buyData) {
            var dataM = buyData[i];
//            var arr = lang?[translation["买一"][transindex[lang]],translation["买二"][transindex[lang]],translation["买三"][transindex[lang]],translation["买四"][transindex[lang]],translation["买五"][transindex[lang]]]:["买一", "买二", "买三", "买四", "买五"];
            var arr = ["1", "2", "3", "4", "5"];
            var tr2 = "<tr><td>" + arr[i] + "</td><td onclick='_getprice(this)' class='color-change "+_color(dataM.Price)+"'>" + (dataM.Price!="-"?dataM.Price.toFixed(2):dataM.Price) + "</td><td>" + (dataM.Vol!="-"?_volfmt(dataM.Vol):dataM.Vol) + "</td></tr>";
            $(".tableTwo").append(tr2);
        }
    }
}

function updateMinute(id, arySymbol, dataType, jsStock) { //明细选项内容
    var read = jsStock.GetStockRead('minute', updateMinute); //获取一个读取数据类,并绑定id,和更新数据方法
    var deal = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.DEAL);
//    var yClose = read.Get(JSEnvironment.Symbol, STOCK_FIELD_NAME.YCLOSE);

	function _color(price){
		if(price!="-"){
	            if (price > yClose) {
	                return "upColor";
        	    } else if (price < yClose) {
	                return "lowColor";
        	    } else {
	                return "symbolAve";
        	    }
		}
	}

	function _volfmt(vol){
vol=vol>=10?Math.round(vol):Number(Number(vol).toFixed(4));
if(lang!="CN")return tometric(vol);
		return (vol>=100000?vol>=100000000?Math.trunc(vol/100000000)+"亿":Math.trunc(vol/10000)+"万":vol)
	}

    read.EndRead();
    // console.log(JSEnvironment.JqTableInfo,"JSEnvironment.JqTableInfo::");
    if (JSEnvironment.JqTableInfo != undefined) { //jqTableInfo=$('<table class="tableInfo"></table>')
        if (deal != undefined) {
            JSEnvironment.JqTableInfo.html("");
            for (var i in deal) {
                var item = deal[i];
/*
                var timer = item.Time;
                timer = timer.toString();
                var timeStr, newTime;
                if (timer.length == 5) {
                    timeStr = "0" + timer;
                } else if (timer.length == 6) {
                    timeStr = timer;
                }
                newTime = timeStr.substring(0, 2) + ":" + timeStr.substring(2, 4);
*/

var timer = new Date(item.Time*1000);
newTime = timer.toTimeString().substr(0,5);

                var trd = "<tr><td>" + newTime + "</td><td onclick='_getprice(this)' class='color-change "+_color(item.Price)+"'>" + item.Price.toFixed(2) + "</td><td>" + _volfmt(item.Vol) + "</td></tr>";
                JSEnvironment.JqTableInfo.append(trd);
            }
        }
    }
}

function updateMinuteChart(options) { //更新分时图
    //根据百分比获取分时图div的宽度
    var trueWidth = document.getElementsByTagName('body')[0].clientWidth * JSEnvironment.WidthPercent;
    $("#minuteKline").width(Number(trueWidth));
    $("#minuteKline").height(360);

    if (JSEnvironment.MinuteChart == null) {
        JSEnvironment.MinuteChart = JSChart.Init(document.getElementById('minuteKline')); // 初始化走势图
        JSChart.SetStyle(JSEnvironment.MinuteOption);
        JSEnvironment.MinuteChart.SetOption(JSEnvironment.MinuteOption);
    }
}

function updateFiveDayMinuteChart() {//更新5日分时图
    $("#fiveDayMinute").width(document.getElementsByTagName('body')[0].clientWidth);
    $("#fiveDayMinute").height(360);
    if (JSEnvironment.FiveDMinuteChart == null) {
        JSEnvironment.FiveDMinuteChart = JSChart.Init(document.getElementById('fiveDayMinute')); // 初始化5日走势图
        JSChart.SetStyle(JSEnvironment.FiveDMinuteOption);
        JSEnvironment.FiveDMinuteChart.SetOption(JSEnvironment.FiveDMinuteOption);
    }
}

function updateHistoryChart(period) { //更新k线图
    //根据百分比获取k线图div的宽度
    var trueWidth = document.getElementsByTagName('body')[0].clientWidth * 0.84;
    $("#kline").width(Number(trueWidth));
    $("#kline").height(360);
    if (JSEnvironment.HistoryChart == null) {
        JSEnvironment.HistoryChart = JSChart.Init(document.getElementById('kline')); //初始化K线图
        JSEnvironment.HistoryOption.KLine.Period = period;
        JSEnvironment.HistoryChart.SetOption(JSEnvironment.HistoryOption);

    } else {
        JSEnvironment.HistoryChart.ChangePeriod(period);
    }
    if ($(".phoneRight").find(".ulOne").length == 0) {
        UpdateIndexListUI();
        $(".phoneRight").append(JSEnvironment.JqUlOne);
        $(".phoneRight").append(JSEnvironment.JqUlTwo);
        var setIndex = new Set();
        var curIndex = JSEnvironment.HistoryChart.GetIndexInfo(); //当前显示的指标
        for (var i in curIndex) {
            var item = curIndex[i];
            var indexName = JSEnvironment.GetIndexName(item.ID);
            setIndex.add(indexName);
        }
        var aryIndexName = JSEnvironment.JqUlTwo.find('li');
        for (var i = 0; i < aryIndexName.length; ++i) {
            var item = aryIndexName[i];
            if (setIndex.has(item.outerText)) JSEnvironment.JqUlTwo.find('li').eq(i).addClass('active');
        }
        // JSEnvironment.JqUlTwo.find('li').eq(0).addClass('active');
    }
    if (period >= 4) {
        JSEnvironment.JqUlOne.hide();  //分钟周期，复权不显示
    } else {
        JSEnvironment.JqUlOne.show();
    }
}

// 获取当前滚动条的位置 
function getScrollTop() {
    var scrollTop = 0;
    if (document.documentElement && document.documentElement.scrollTop) {
        scrollTop = document.documentElement.scrollTop;
    } else if (document.body) {
        scrollTop = document.body.scrollTop;
    }
    return scrollTop;
}

// 获取当前可视范围的高度 
function getClientHeight() {
    var clientHeight = 0;
    if (document.body.clientHeight && document.documentElement.clientHeight) {
        clientHeight = Math.min(document.body.clientHeight, document.documentElement.clientHeight);
    } else {
        clientHeight = Math.max(document.body.clientHeight, document.documentElement.clientHeight);
    }
    return clientHeight;
}

// 获取文档完整的高度 
function getScrollHeight() {
    return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
}

// 节流函数
var throttle = function (method, context) {
    clearTimeout(method.tId);
    method.tId = setTimeout(function () {
        method.call(context);
    }, 300);
}

//获取下一页内容
function fetchData() {
    switch (JSEnvironment.CurrentFlag) {
        case JSEnvironment.CurrentNews:
            news.GetNextPage();
            break;
        case JSEnvironment.CurrentInteract:
            interacts.GetNextPage();
            break;
        case JSEnvironment.CurrentNotice:
            notices.GetNextPage();
            break;
    }

}

//tab 切换
function changeTab(tabsClassName) {
    $(tabsClassName).click(function () {
        JSEnvironment.CurrentFlag = $(this).index();
        $(tabsClassName).removeClass('active');
        $(tabsClassName).closest(".tabsTitle").siblings('.tabsContent').children().removeClass('active');
        $(this).addClass('active');
        $(tabsClassName).closest(".tabsTitle").siblings('.tabsContent').children().eq($(this).index()).addClass('active');
    });
}

function NetworkFilter(data, callback)
{
    console.log('[NetworkFilter] data', data);
}

$(function () {
    LoadEnvironment();
/*
    $.fn.extend({ 
        disableSelection : function() { 
                this.each(function() { 
                        this.onselectstart = function() { return false; }; 
                        this.unselectable = "on"; 
                        $(this).css('-moz-user-select', 'none'); 
                        $(this).css('-webkit-user-select', 'none'); 
                }); 
        } 
    });
*/
    var debug = getURLParams('debug');
    if (debug == 1) {
        var vConsole = new VConsole();
        console.log('create VConsole');
    }

    window.addEventListener("onorientationchange" in window ? "orientationchange" : "resize", hengshuping, false);

    //加载个股新闻数据
    var news = JSNews.GetNews('600000.sh', NEWS_TYPE.STOCK_NEWS);
    news.Callback = UpdateNews;
//    news.GetFirstPage();
    //加载互动易
    var interacts = JSNews.GetNews('600000.sh', NEWS_TYPE.STOCK_INTERACT);
    interacts.Callback = UpateInteracts;
//    interacts.GetFirstPage();
    //加载公告
    var notices = JSNews.GetNews('600000.sh', NEWS_TYPE.STOCK_REPORT);
    notices.Callback = UpdateNoticess;
//    notices.GetFirstPage();

/*
    //分钟下拉选择
    var showMinuteDOM = document.querySelector('#showMinute');
    var minuteIdDOM = document.querySelector('#minuteId');
    var data = [{
        "id": 4,
        "value": '1分钟'
    },
    {
        "id": 5,
        "value": '5分钟'
    },
    {
        "id": 6,
        "value": '15分钟'
    },
    {
        "id": 7,
        "value": '30分钟'
    },
    {
        "id": 8,
        "value": '60分钟'
    }
    ];
    showMinuteDOM.addEventListener('click', function () {
        var minuteId = showMinute.dataset['id'];
        var minuteName = showMinute.dataset['value'];

        var bankSelect = new IosSelect(1,
            [data], {
                container: '.container',
                title: '',
                itemHeight: 40,
                itemShowCount: 6,
                oneLevelId: minuteId,
                callback: function (selectOneObj) {
                    minuteIdDOM.value = selectOneObj.id;
                    showMinuteDOM.innerHTML = selectOneObj.value;
                    showMinuteDOM.dataset['id'] = selectOneObj.id;
                    showMinuteDOM.dataset['value'] = selectOneObj.value;
                    $(".minuteWrap").hide();
                    $(".fiveDayMinuteWrap").hide();
                    var period = parseInt(selectOneObj.id);
                    updateHistoryChart(period);
                    $(showMinuteDOM).addClass("active").siblings().removeClass("active");
                    $(".klineWrap").show();

window.chartdata.viewperiod=period.toString();

                }
            });

    });
*/

    window.onscroll = function () {
        if (getScrollTop() + getClientHeight() == getScrollHeight()) {
            // textLoadFlag.innerText = '加载中...';
            throttle(fetchData);
        }
    };

    //点击后，绘制相应周期的K线图
    $(".kLineTabs .tabsTitle>.k").click(function () {
        $(".minuteWrap").hide();
//        var period = $(this).index() - 2; //"年线"没有了

var period=$(this).index();
switch(period){
  case 1: period=0; break;
  case 2: period=12; break;
  case 3: period=11; break;
  case 4: period=8; break;
  case 5: period=7; break;
  case 6: period=6; break;
  case 7: period=5; break;
  case 8: period=4; break;
}

        $(this).addClass("active").siblings().removeClass("active");
        // $("#minuteKline").hide();
        $(".fiveDayMinuteWrap").hide();
        $(".klineWrap").show();
        updateHistoryChart(period);

window.chartdata.viewperiod=period.toString();

    });

    //点击后，绘制分时图
    $("#minuteChartSelect").click(function () {
        $(".klineWrap").hide();
        $(".fiveDayMinuteWrap").hide();
        $(".minuteWrap").show();
        $(this).addClass("active").siblings().removeClass("active");
        updateMinuteChart();
        $(".minute-tab .tableSell").trigger('click');

window.chartdata.viewperiod='00';

    });
    //点击后，绘制5日分时图
    $("#fiveDMinute").click(function () {
        $(".klineWrap").hide();
        $(".minuteWrap").hide();
        $(".fiveDayMinuteWrap").show();
        $(this).addClass("active").siblings().removeClass("active");
        updateFiveDayMinuteChart();

window.chartdata.viewperiod='05';

    });

    //收缩股票信息
    $(".shrinkBtn").click(function () {
///        $(".exchangeInfoT").toggle();
///       $(".shrinkBtn").toggleClass('open');
    });
    $(".exchangeData .priceHL,.exchangeData .priceOpen,.exchangeData .priceAmount").click(function () {
///        $(".exchangeInfoT").show();
///        $(".shrinkBtn").addClass('open');
    });
    $(".exchangeInfoT").click(function () {
        $(this).hide();
        $(".shrinkBtn").removeClass('open');
    });


    changeTab(".qATtabs .tabsTitle span"); //新闻tab切换


    //复权切换
    JSEnvironment.JqUlOne.on('click', 'li', function () {
        var num = $(this).index();
        JSEnvironment.HistoryChart.ChangeRight(num);
        $(this).addClass("active").siblings().removeClass("active");
    });
    //指标切换
    JSEnvironment.JqUlTwo.on('click', 'li', function () {
        var text = $(this).text();
        var indexName=JSEnvironment.GetIndexByName(text);
        console.log(indexName,"指标名称");
        JSEnvironment.HistoryChart.ChangeIndex(0, indexName);
        var setIndex=new Set();
        var curIndex=JSEnvironment.HistoryChart.GetIndexInfo(); //当前显示的指标
        for(var i in curIndex)
        {
            var item=curIndex[i];
            var indexName=JSEnvironment.GetIndexName(item.ID);
            setIndex.add(indexName);
        }

        var aryIndexName= JSEnvironment.JqUlTwo.find('li');
        for(var i=0;i<aryIndexName.length;++i)
        {
            var item=aryIndexName[i];
//            if (setIndex.has(item.outerText)) JSEnvironment.JqUlTwo.find('li').eq(i).addClass('active');
//            else JSEnvironment.JqUlTwo.find('li').eq(i).removeClass('active');

if(text=="MA" || text=="BOLL") {
   if(item.outerText=="BOLL" || item.outerText=="MA") aryIndexName.eq(i).removeClass('active');
   if(item.outerText==text) aryIndexName.eq(i).addClass('active');
}
else if(item.outerText!="MA" && item.outerText!="BOLL") {
   aryIndexName.eq(i).removeClass('active');
   if(item.outerText==text) aryIndexName.eq(i).addClass('active');
}
        }
    });

    JSEnvironment.StockCache = JSStock.Init(); //初始化数据控件
    JSEnvironment.StockCache.NetworkFilter=NetworkFilter;
    var arySymbol = new Array();
    arySymbol.push(JSEnvironment.Symbol);

    UpdateMain(null, null, null, JSEnvironment.StockCache);
    updateMinute(null, null, null, JSEnvironment.StockCache); //明细
    updateMinuteFive(null, null, null, JSEnvironment.StockCache); //五档
    $("#minute").hide();
    $(".minute-tab .tableSell").click(function () { //切换五档
        $(this).addClass('active').siblings().removeClass('active');
        updateMinuteFive(null, null, null, JSEnvironment.StockCache); //五档
        $("#minuteFive").show();
        $("#minute").hide();
    });
    $(".minute-tab .tableBuy").click(function () { //切换明细
        $("#minute").html(JSEnvironment.JqTableInfo);
        $(this).addClass('active').siblings().removeClass('active');
        updateMinute(null, null, null, JSEnvironment.StockCache); //明细
        $("#minute").show();
        $("#minuteFive").hide();

    });

$("#five2").click(function () { //切换五档
    $(this).addClass('active').siblings().removeClass('active');
    updateMinuteFive(null, null, null, JSEnvironment.StockCache); //五档
    $(".minuteFive2").show();
    $(".minute2").hide();
});
$("#deal2").click(function () { //切换明细
    $(".minute2").html(JSEnvironment.JqTableInfo);
    $(this).addClass('active').siblings().removeClass('active');
    updateMinute(null, null, null, JSEnvironment.StockCache); //明细
    $(".minute2").show();
    $(".minuteFive2").hide();

});

    JSEnvironment.StockCache.ReqeustData();

//    $("#minuteChartSelect").trigger('click');


var _ttt=setInterval(function(){
  if(typeof JSChart=='undefined')return;
  clearInterval(_ttt);
  $("#minuteChartSelect").trigger('click');
},1000);


})