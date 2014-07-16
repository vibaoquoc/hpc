//Require jquery & Socket.IO & Mustache
var GateTVchat = GateTVchat || {};
var is_ready = false;

GateTVchat = {
    _host: '192.3.165.62',
    _port: '8080',
    _socket : null,
    _username : null,
    _is_mod : false,
    _token : '',
    _current_conversation : '',
    _contacts : [
                    {name:'Vi Bảo Quốc',avatar:"",phone:"0906099321"},
                    {name:'Đặng Công Thanh',avatar:"",phone:"0906299321"},
                    {name:'Lê Khánh Giàu',avatar:"",phone:"0906097321"},
                    {name:'Lê Trung Hiếu',avatar:"",phone:"0906092321"},
                    {name:'Trương Hoàng Mi',avatar:"",phone:"0908099321"},
                    {name:'Phạm Thanh Hiền',avatar:"",phone:"0976099321"},
                    {name:'Mai Ngọc Sương',avatar:"",phone:"0906099391"},
                    {name:'Đoàn Trung Tính',avatar:"",phone:"0906099521"},
                    {name:'Dương Thanh Tâm',avatar:"",phone:"0906699321"},
                    {name:'Nguyễn Phương Bình',avatar:"",phone:"0906799321"},
                    {name:'Nguyễn Nhật Thu',avatar:"",phone:"0906099021"}
    ],
    _format : function(type,data) {
        /*
            messageSend         : Định dạng tin nhắn gởi đi
            messageReceive      : Định dạng tin nhắn nhận được
            messageReceive_ser  : Định dạng tin nhắn của hệ thống
            itemPeople          : Định dạng item hiển thị trong list member
        */
        var fullname = data.name;
        //data.name = data.name.split("@")[0];
        switch(type) {
            case 'messageForMod' : {
                var temp = "<p><strong style='color:{{color}}'><img title='Add user thành moderator' style='cursor: pointer;' onclick=GateTVchat.addmod('"+ fullname +"') src='images/mod.png'>{{name}}<img title='Ban/UnBan user này' style='cursor: pointer;' onclick=GateTVchat.bannick('"+ fullname +"',1) src='images/control.png'> :</strong> {{&msg}}</p>";
                return Mustache.render(temp,data);
            };
            case 'messageSend' : {
                var temp = '<li> \
                            <div class="bubble2"> \
                            <span class="personSay2">{{&msg}}</span> </div> \
                            <span class=" time2 round ">10:51 PM<span><img src="css/images/msg_sent.png" width="16" height="16"></span></span> </li>';
                return Mustache.render(temp,data);
            };
            case 'messageReceive' : {
                var temp ='<li> \
                            <div class="bubble"> \
                            <span class="personSay">{{&msg}}</span> </div> \
                            <span class="time round">12:55 AM <span><img src="css/images/msg_sent.png" width="16" height="16"></span> </span> </li>';
                return Mustache.render(temp,data);
            };
            case 'messageReceive_ser' : {
                var temp = '<li class="separator"><span>Today<span></li>';
                return Mustache.render(temp,data);
            };
            case 'listContacts' : {
                var temp = "{{#contacts}} \
                                <li onclick=GateTVchat.set_current_conversation('{{phone}}'); id='{{phone}}'><a href='#pageConversation'>{{name}}</a> \
                                <a href='#infoUser' data-rel='popup' data-position-to='window' data-transition='pop'>Profile</a> \
                                </li> \
                            {{/contacts}}";
                return Mustache.render(temp,data);
            };
            default:{
                return "";
            }
        }
    },
    init: function (username,token) {
        /*
            Khởi tạo các đối tượng trên giao diện map với DOM
            Init các event button , textbox chat , emoticon
            Cài đặt listening cho socket.io 
                update          :
                update-people   :
                chat            :
                listmoderator   :
                disconnect      :
        */
        _listMessage = $("#conversation");
        _listMember = $("#listContacts");
        _textInput = $("#txtM");
        _sendButton = $("#btnSend");
        _listEmotion = $(".emotions .wrapper-e");
        this._username = username;
        _label_name_partner = $("#label_name_partner");
        _emotionButton = $("#btnEmotion");
        this._token = token;

        _socket.on("update", function(msg) {
            //console.log(msg);
            if(is_ready){
                if (msg == 'Chào mừng bạn tham gia Gate TV.'){
                    return;
                }
                _listMessage.append(GateTVchat._format('messageReceive',{name:'GateTV',msg:msg}));
            }
        });

        _socket.on("update-people", function(people){
            //console.log(people); console.log(is_ready);
            var uniqueMember = new Array();
            var total = 0;
            if(is_ready) {
                GateTVchat.bindContacts();
                $.each(people, function(clientid, name) {
                    total++;
                    if (uniqueMember.indexOf(name) == -1){
                        uniqueMember.push(name);
                    }
                    //console.log(name);
                    GateTVchat.updateStatus(name,'ONLINE');
                    //_listMember.append(GateTVchat._format('itemPeople',{name:name}));
                });
            }
            //console.log(uniqueMember);
            //_lbCountCCU.text(total);
            //_lbCountMember.text(uniqueMember.length);
        });

        _socket.on("chat", function(who, msg, color){
            msg = $("<p>" + msg + "</p>").text();
            if(is_ready && $('.ui-page-active').attr('id') == "pageConversation" && (who == GateTVchat._current_conversation || who == GateTVchat._username)) {
                if (who == GateTVchat._username){
                    _listMessage.append(GateTVchat._format('messageSend',{name:who,msg: emotify(msg),color:color}));
                }else{
                    _listMessage.append(GateTVchat._format('messageReceive',{name:who,msg: emotify(msg),color:color}));
                }
                _listMessage.animate({ scrollTop:  _listMessage[0].scrollHeight}, 1000);
            }
            if (who != GateTVchat._username){
                GateTVchat.saveOffline(who,who, msg, color);
            }else{
                GateTVchat.saveOffline(GateTVchat._current_conversation,who, msg, color);
            }

            if(is_ready && $('.ui-page-active').attr('id') == "pageContacts"){
                if (who != GateTVchat._username){
                    GateTVchat.incrementMsgCount(who,0);
                }
            }
        });

        _socket.on("listmoderator", function(data){
            if (data.indexOf(GateTVchat._username) > -1){
                GateTVchat._is_mod = true;
            }
        });

        _socket.on("disconnect", function(){
            setTimeout(GateTVchat.join() , 2000);
        });

        _sendButton.click(function(){
            if (GateTVchat._username.indexOf("Guest") > -1){
                FOConnect.login();
                return;
            }
            var msg = _textInput.val();
            if (msg != ""){
                _socket.emit("send", msg, GateTVchat._current_conversation);
                _textInput.val("");
            }
        });

        _textInput.keypress(function(e){
            if(e.which == 13) {
                if (GateTVchat._username.indexOf("Guest") > -1){
                    FOConnect.login();
                    return;
                }
                var msg =  _textInput.val();
                if (msg != ""){
                    _socket.emit("send", msg , GateTVchat._current_conversation);
                    e.preventDefault();
                    _textInput.val("");
                }
            }
        });

        _emotionButton.click(function(){
            $(".emotions").toggle();
            GateTVchat.resizeFormChat();
        });

        this.bindEmotions();
        this.bindContacts();
    },
    join : function(){
        _socket.emit("join", this._username, this._token);
        is_ready = true;

        _socket.emit("listmoderator");
        return true;
    },
    setcolor : function(data){
        _socket.emit("setcolor",data);
    },
    clearHistory : function(){
        _listMessage.html('');
    },
    loadHistoryMessage : function(who){
        _listMessage.empty();
        var key_storage = "msg_" + who;
        var data = JSON.parse(localStorage.getItem(key_storage));
        console.log(data);
        if (data != null){
            $.each(data, function(index,message) {
                console.log(message);
                if (message.who == GateTVchat._username){
                    _listMessage.append(GateTVchat._format('messageSend',{name:message.who,msg: emotify(message.msg),color:message.color}));
                }else{
                    _listMessage.append(GateTVchat._format('messageReceive',{name:message.who,msg: emotify(message.msg),color:message.color}));
                }
            });
            _listMessage.animate({ scrollTop:  _listMessage[0].scrollHeight}, 1000);
        }
    },
    updateStatus : function(phone_number,status){
        if (status == "ONLINE"){
            console.log(phone_number);
            console.log(status);    
            if (_listMember.find("#" + phone_number + " a .ui-li-count").length > 0){
                var t = _listMember.find("#" + phone_number + " a .ui-li-count").text();
                if (parseInt(t) === 0){
                    _listMember.find("#" + phone_number + " a .ui-li-count").text("ONLINE");
                }
            }else{
                _listMember.find("#" + phone_number + " a:first").append('<span class="ui-li-count">ONLINE</span>');    
            }
        }
    },
    saveOffline : function(with_id,who, msg, color){
        //a people / key localstorage
        var key_storage = "msg_" + with_id;
        var data = JSON.parse(localStorage.getItem(key_storage));
        if (data === null){
            data = [{who:who,msg:msg,color:color,time:new Date()}];
        }else{
            data.push({who:who,msg:msg,color:color,time:new Date()});
        }
        localStorage.setItem(key_storage, JSON.stringify(data));
        console.log(data);
    },
    bindEmotions : function(){
        var html = '';
        $.each( emotify.emoticons(), function(k,v){
            html += '<li title="'+ v[1] +'" name="'+ k +'" onclick="GateTVchat.appendEmotion(\''+ k +'\');">' + emotify( k ) + '<\/li>';
        });
        //console.log(html);
        _listEmotion.html( html );
    },
    bindContacts : function(){
        var html = GateTVchat._format('listContacts',{contacts:GateTVchat._contacts.filter(function(a){ return a.phone != GateTVchat._username; })});
        _listMember.html( html );
        _listMember.listview('refresh');
    },
    appendEmotion : function (str) {
        _textInput.val( _textInput.val() + str + " ");
        _textInput.focus();
    },
    bannick : function (user_ban,type_banned) {
        _socket.emit("bannick",user_ban, type_banned, "");
        alert('Đã Ban/UnBan user thành công');
    },
    set_current_conversation : function (phone_number) {
        _listMessage.empty();
        GateTVchat._current_conversation = phone_number;
        var contact = GateTVchat._contacts.filter(function(a){ return a.phone == phone_number; });
        _label_name_partner.text(contact[0].name);
        GateTVchat.loadHistoryMessage(phone_number);
        GateTVchat.resizeFormChat();
    },
    resizeFormChat : function(){
        $("#containsChat").height($(window).height()  - 140 - $("#footerChat").height());
    },
    incrementMsgCount : function(phone_number,is_reset){
        console.log(phone_number);
        if (is_reset != 1){
            //Update message count
            if (_listMember.find("#" + phone_number + " a .ui-li-count").length > 0){
                var t = _listMember.find("#" + phone_number + " a .ui-li-count").text();
                console.log(t);
                if (isNaN(parseInt(t))) {
                    _listMember.find("#" + phone_number + " a .ui-li-count").text("1");
                }else{
                    _listMember.find("#" + phone_number + " a .ui-li-count").text( parseInt(t) + 1 );
                }
            }else{
                _listMember.find("#" + phone_number + " a:first").append('<span class="ui-li-count">1</span>');    
            }
        }else{
            _listMember.find("#" + phone_number + " a:first").text(_listMember.find("#" + phone_number + " a:first").text());
        }
    },
    md5 : function (string) {
        function RotateLeft(lValue, iShiftBits) {
            return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));;
        }
     
        function AddUnsigned(lX,lY) {
            var lX4,lY4,lX8,lY8,lResult;
            lX8 = (lX & 0x80000000);
            lY8 = (lY & 0x80000000);
            lX4 = (lX & 0x40000000);
            lY4 = (lY & 0x40000000);
            lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
            if (lX4 & lY4) {
                return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
            }
            if (lX4 | lY4) {
                if (lResult & 0x40000000) {
                    return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                } else {
                    return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
                }
            } else {
                return (lResult ^ lX8 ^ lY8);
            }
         }
     
         function F(x,y,z) { return (x & y) | ((~x) & z); }
         function G(x,y,z) { return (x & z) | (y & (~z)); }
         function H(x,y,z) { return (x ^ y ^ z); }
        function I(x,y,z) { return (y ^ (x | (~z))); }
     
        function FF(a,b,c,d,x,s,ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };
     
        function GG(a,b,c,d,x,s,ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };
     
        function HH(a,b,c,d,x,s,ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };
     
        function II(a,b,c,d,x,s,ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };
     
        function ConvertToWordArray(string) {
            var lWordCount;
            var lMessageLength = string.length;
            var lNumberOfWords_temp1=lMessageLength + 8;
            var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
            var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
            var lWordArray=Array(lNumberOfWords-1);
            var lBytePosition = 0;
            var lByteCount = 0;
            while ( lByteCount < lMessageLength ) {
                lWordCount = (lByteCount-(lByteCount % 4))/4;
                lBytePosition = (lByteCount % 4)*8;
                lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
                lByteCount++;
            }
            lWordCount = (lByteCount-(lByteCount % 4))/4;
            lBytePosition = (lByteCount % 4)*8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
            lWordArray[lNumberOfWords-2] = lMessageLength<<3;
            lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
            return lWordArray;
        };
     
        function WordToHex(lValue) {
            var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
            for (lCount = 0;lCount<=3;lCount++) {
                lByte = (lValue>>>(lCount*8)) & 255;
                WordToHexValue_temp = "0" + lByte.toString(16);
                WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
            }
            return WordToHexValue;
        };
     
        function Utf8Encode(string) {
            string = string.replace(/\r\n/g,"\n");
            var utftext = "";
     
            for (var n = 0; n < string.length; n++) {
     
                var c = string.charCodeAt(n);
     
                if (c < 128) {
                    utftext += String.fromCharCode(c);
                }
                else if((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
                else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
     
            }
     
            return utftext;
        };
     
        var x=Array();
        var k,AA,BB,CC,DD,a,b,c,d;
        var S11=7, S12=12, S13=17, S14=22;
        var S21=5, S22=9 , S23=14, S24=20;
        var S31=4, S32=11, S33=16, S34=23;
        var S41=6, S42=10, S43=15, S44=21;
     
        string = Utf8Encode(string);
     
        x = ConvertToWordArray(string);
     
        a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
     
        for (k=0;k<x.length;k+=16) {
            AA=a; BB=b; CC=c; DD=d;
            a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
            d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
            c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
            b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
            a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
            d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
            c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
            b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
            a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
            d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
            c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
            b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
            a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
            d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
            c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
            b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
            a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
            d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
            c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
            b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
            a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
            d=GG(d,a,b,c,x[k+10],S22,0x2441453);
            c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
            b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
            a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
            d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
            c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
            b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
            a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
            d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
            c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
            b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
            a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
            d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
            c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
            b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
            a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
            d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
            c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
            b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
            a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
            d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
            c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
            b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
            a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
            d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
            c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
            b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
            a=II(a,b,c,d,x[k+0], S41,0xF4292244);
            d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
            c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
            b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
            a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
            d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
            c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
            b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
            a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
            d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
            c=II(c,d,a,b,x[k+6], S43,0xA3014314);
            b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
            a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
            d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
            c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
            b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
            a=AddUnsigned(a,AA);
            b=AddUnsigned(b,BB);
            c=AddUnsigned(c,CC);
            d=AddUnsigned(d,DD);
        }
     
        var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);
     
        return temp.toLowerCase();
    },

};

//Define indexOf array if not exist
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement, fromIndex) {
      if ( this === undefined || this === null ) {
        throw new TypeError( '"this" is null or not defined' );
      }

      var length = this.length >>> 0; // Hack to convert object.length to a UInt32

      fromIndex = +fromIndex || 0;

      if (Math.abs(fromIndex) === Infinity) {
        fromIndex = 0;
      }

      if (fromIndex < 0) {
        fromIndex += length;
        if (fromIndex < 0) {
          fromIndex = 0;
        }
      }

      for (;fromIndex < length; fromIndex++) {
        if (this[fromIndex] === searchElement) {
          return fromIndex;
        }
      }

      return -1;
    };
  }

var _socket = io.connect(GateTVchat._host +':'+ GateTVchat._port);