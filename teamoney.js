const _0x4c18da=_0xd891;(function(_0x191f98,_0x44191d){const _0x50439b=_0xd891,_0x15c39a=_0x191f98();while(!![]){try{const _0x1ae814=parseInt(_0x50439b(0x1d1))/0x1+-parseInt(_0x50439b(0x1a4))/0x2+-parseInt(_0x50439b(0x1b0))/0x3*(parseInt(_0x50439b(0x1c9))/0x4)+-parseInt(_0x50439b(0x1bc))/0x5*(-parseInt(_0x50439b(0x1c5))/0x6)+parseInt(_0x50439b(0x1c1))/0x7*(parseInt(_0x50439b(0x1cc))/0x8)+-parseInt(_0x50439b(0x1af))/0x9+parseInt(_0x50439b(0x1c3))/0xa;if(_0x1ae814===_0x44191d)break;else _0x15c39a['push'](_0x15c39a['shift']());}catch(_0x10ebc2){_0x15c39a['push'](_0x15c39a['shift']());}}}(_0x41ee,0x5721b));const axios=require(_0x4c18da(0x1a6)),cheerio=require('cheerio');function _0xd891(_0x4b63fc,_0x3eba9e){const _0x41eebe=_0x41ee();return _0xd891=function(_0xd891ce,_0x177165){_0xd891ce=_0xd891ce-0x1a0;let _0x5e75bd=_0x41eebe[_0xd891ce];return _0x5e75bd;},_0xd891(_0x4b63fc,_0x3eba9e);}async function fetchAndCleanPage(_0x36269e,_0x871ab1,_0x21068f){const _0x47c450=_0x4c18da;try{const _0x443b03=await axios[_0x47c450(0x1b6)](_0x36269e,{'headers':{'User-Agent':'Mozilla/5.0\x20(Windows\x20NT\x2010.0;\x20Win64;\x20x64)\x20AppleWebKit/537.36\x20(KHTML,\x20like\x20Gecko)\x20Chrome/91.0.4472.124\x20Safari/537.36','Accept':_0x47c450(0x1bb),'Accept-Language':_0x47c450(0x1bd),'Connection':_0x47c450(0x1ad)},'timeout':0x1388}),_0x521ff1=cheerio[_0x47c450(0x1bf)](_0x443b03['data']);_0x521ff1(_0x47c450(0x1b4))[_0x47c450(0x1b8)](_0x47c450(0x1d0)+_0x871ab1+_0x47c450(0x1b5)+_0x21068f+_0x47c450(0x1aa)),_0x521ff1('body')[_0x47c450(0x1b8)]('<div\x20style=\x22text-align:\x20center;\x20padding:\x2010px;\x20font-size:\x2024px;\x22>by\x20:\x20LiAnimebot</div>'),_0x521ff1(_0x47c450(0x1c2))['append'](_0x47c450(0x1a0)),_0x521ff1('p')[_0x47c450(0x1cd)](function(){const _0x5731d8=_0x47c450,_0x5d9c62=_0x521ff1(this)[_0x5731d8(0x1b1)]();return/مانجا.*Solo Leveling.*Chapter.*201.*مانجا.*ARESManga.*أفضل.*موقع.*للمانهو.*المانجا.*العربية/['test'](_0x5d9c62);})['remove'](),_0x521ff1(_0x47c450(0x1c2))[_0x47c450(0x1b8)](_0x47c450(0x1a9)),_0x521ff1('body')[_0x47c450(0x1b8)](_0x47c450(0x1c4)),_0x521ff1('body')[_0x47c450(0x1ac)]('\x0a\x20\x20\x20\x20\x20\x20<button\x20id=\x22fullScreenButton\x22\x20style=\x22position:\x20fixed;\x20bottom:\x2010px;\x20right:\x2010px;\x20padding:\x2010px\x2020px;\x20background-color:\x20#0088cc;\x20color:\x20white;\x20border:\x20none;\x20border-radius:\x205px;\x20cursor:\x20pointer;\x20z-index:\x2010000;\x22>الشاشة\x20الكاملة</button>\x0a\x20\x20\x20\x20\x20\x20<style>\x0a\x20\x20\x20\x20\x20\x20\x20\x20#fullScreenButton.hidden\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20none;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20</style>\x0a\x20\x20\x20\x20\x20\x20<script>\x0a\x20\x20\x20\x20\x20\x20\x20\x20//\x20تفعيل\x20وضع\x20الشاشة\x20الكاملة\x20عند\x20النقر\x20على\x20الزر\x0a\x20\x20\x20\x20\x20\x20\x20\x20document.getElementById(\x27fullScreenButton\x27).addEventListener(\x27click\x27,\x20function()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(!document.fullscreenElement)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.documentElement.requestFullscreen();\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(document.exitFullscreen)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.exitFullscreen();\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20//\x20التحكم\x20في\x20ظهور\x20واختفاء\x20الزر\x20بناءً\x20على\x20التمرير\x0a\x20\x20\x20\x20\x20\x20\x20\x20let\x20timer;\x0a\x20\x20\x20\x20\x20\x20\x20\x20window.addEventListener(\x27scroll\x27,\x20function()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20clearTimeout(timer);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.getElementById(\x27fullScreenButton\x27).classList.add(\x27hidden\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20timer\x20=\x20setTimeout(function()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.getElementById(\x27fullScreenButton\x27).classList.remove(\x27hidden\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20},\x201500);\x0a\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20</script>\x0a\x20\x20\x20\x20');const _0x3c4401=[_0x47c450(0x1b2),_0x47c450(0x1ae),'div.ltr',_0x47c450(0x1be),_0x47c450(0x1ab),'div.entry-header.footer',_0x47c450(0x1a5),'div.single-chapter-tools',_0x47c450(0x1cf),_0x47c450(0x1ba),'script[src=\x22https://code.jquery.com/jquery-3.6.1.min.js\x22]',_0x47c450(0x1c7),_0x47c450(0x1c8),'div.allc',_0x47c450(0x1c6),_0x47c450(0x1b9),'div.chnav.cbot',_0x47c450(0x1b3),_0x47c450(0x1a7),_0x47c450(0x1a3),_0x47c450(0x1a1),_0x47c450(0x1ce),_0x47c450(0x1cb)];return _0x3c4401[_0x47c450(0x1c0)](_0x1b89c6=>_0x521ff1(_0x1b89c6)['remove']()),_0x521ff1(_0x47c450(0x1a8))['each']((_0x4cfafa,_0xf57f35)=>{const _0x1afd97=_0x47c450,_0x37d278=_0x521ff1(_0xf57f35)[_0x1afd97(0x1a2)]();/\(function\(\$\) \{\s*setInterval\(\(\) => \{\s*\$.each\(\$('iframe'), \(arr, x\) => \{\s*let sandbox = \$(x)\.attr\('sandbox'\);\s*if \(sandbox && sandbox\.match\(\s*\/\(allow-forms allow-popups allow-same-origin allow-scripts\)\/gi\)\) \{\s*\$(x)\.remove\(\);\s*\}\s*\}\);\s*\}, 300\);\s*\}\)\(jQuery\);/['test'](_0x37d278)&&_0x521ff1(_0xf57f35)['remove']();}),_0x521ff1[_0x47c450(0x1a2)]();}catch(_0x1d2dce){throw new Error(_0x47c450(0x1b7));}}module[_0x4c18da(0x1ca)]={'fetchAndCleanPage':fetchAndCleanPage};function _0x41ee(){const _0x1ead98=['\x0a\x20\x20\x20\x20\x20\x20<div\x20style=\x22text-align:\x20center;\x20margin-top:\x2020px;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20<a\x20href=\x22https://telegra.ph/%D8%B7%D8%B1%D9%8A%D9%82%D8%A9-%D8%AA%D8%AD%D9%85%D9%8A%D9%84-%D8%A7%D9%84%D9%81%D8%B5%D9%88%D9%84-07-23\x22\x20style=\x22display:\x20inline-block;\x20padding:\x2010px\x2020px;\x20background-color:\x20#0088cc;\x20color:\x20white;\x20text-decoration:\x20none;\x20border-radius:\x205px;\x22>طريقة\x20تحميل\x20الفصل.</a>\x0a\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20','9426kIOVmn','div.ts-breadcrumb.bixbox','ul#menu-menu','div.searchx.minmb','4JAARWC','exports','speakol-widget.loaded.viewed','8oDrXJu','filter','spk-default-wg.spk-slider-wg.sp-one-item','div.container','<title>','66249pMKEqF','<div\x20style=\x22text-align:\x20center;\x20padding:\x2010px;\x20font-size:\x2024px;\x22>شكرا\x20على\x20المشاهدة</div>','ul#menu-footer','html','div.bixbox.comments-area','598102dkFJYN','div.sidebar-hidden.col-12.col-sm-12.col-md-12.col-lg-12','axios','div.bixbox','script','\x0a\x20\x20\x20\x20\x20\x20<div\x20id=\x22loadingMessage\x22\x20style=\x22position:\x20fixed;\x20top:\x200;\x20left:\x200;\x20width:\x20100%;\x20height:\x20100%;\x20background-color:\x20rgba(0,\x200,\x200,\x200.8);\x20z-index:\x209999;\x20display:\x20flex;\x20align-items:\x20center;\x20justify-content:\x20center;\x20flex-direction:\x20column;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20<div\x20style=\x22margin-bottom:\x2010px;\x20color:\x20#ffffff;\x22>جاري\x20تحميل\x20الصفحة...\x20الرجاء\x20الانتظار\x20قد\x20يأخذ\x20الامر\x20وقتا,\x20ألامر\x20يعتمد\x20على\x20جوده\x20ألانترنيت\x20الخاص\x20بك\x0a\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22spinner\x22\x20style=\x22border:\x2016px\x20solid\x20#f3f3f3;\x20border-radius:\x2050%;\x20border-top:\x2016px\x20solid\x20#3498db;\x20width:\x20120px;\x20height:\x20120px;\x20-webkit-animation:\x20spin\x202s\x20linear\x20infinite;\x20animation:\x20spin\x202s\x20linear\x20infinite;\x22></div>\x0a\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20<style>\x0a\x20\x20\x20\x20\x20\x20\x20\x20@-webkit-keyframes\x20spin\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x200%\x20{\x20-webkit-transform:\x20rotate(0deg);\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20100%\x20{\x20-webkit-transform:\x20rotate(360deg);\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20@keyframes\x20spin\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x200%\x20{\x20transform:\x20rotate(0deg);\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20100%\x20{\x20transform:\x20rotate(360deg);\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20</style>\x0a\x20\x20\x20\x20\x20\x20<script>\x0a\x20\x20\x20\x20\x20\x20\x20\x20window.addEventListener(\x27load\x27,\x20function()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20var\x20loadingMessage\x20=\x20document.getElementById(\x27loadingMessage\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(loadingMessage)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20loadingMessage.style.display\x20=\x20\x27none\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20</script>\x0a\x20\x20\x20\x20','</title>','div.mb-3.mt-2','append','keep-alive','div.centernav.bound','5575716BzRPal','1064199UiOtKE','text','div.navbar.navbar-expand-sm.navbar-dark','div.chaptertags','head','\x20-\x20','get','فشل\x20في\x20تحميل\x20الصفحة','prepend','div.chnav.ctop.nomirror','div.text-center','text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8','640MTCNsD','en-US,en;q=0.9','div.th','load','forEach','3076633GTjuYr','body','9233430lbRGXn'];_0x41ee=function(){return _0x1ead98;};return _0x41ee();}
