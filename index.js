const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const Botly = require("botly");
const quote = require('./quotes');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false} });
const botly = new Botly({
	accessToken: process.env.PAGE_ACCESS_TOKEN,
	notificationType: Botly.CONST.REGULAR,
	FB_URL: "https://graph.facebook.com/v2.6/",
});
app.get("/", function(_req, res) {
	res.sendStatus(200);
});
/* ----- ESSENTIALS ----- */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/* ----- MAGIC ----- */
app.post('/webhook', (req, res) => {
 // console.log(req.body)
  if (req.body.message) {
    onMessage(req.body.message.sender.id, req.body.message);
  } else if (req.body.postback) {
    onPostBack(req.body.postback.message.sender.id, req.body.postback.message, req.body.postback.postback);
  }
  res.sendStatus(200);
});

const langbtn = (code) => {
  if (code == "ar") {
    return "Arabic 🇩🇿";
  } else if (code == "en") {
    return "English 🇺🇸";
  } else if (code == "fr") {
    return "French 🇫🇷";
  } else if (code == "de") {
    return "German 🇩🇪";
  } else if (code == "es") {
    return "Spanish 🇪🇸";
  } else if (code == "ru") {
    return "Russian 🇷🇺";
  } else if (code == "it") {
    return "Italian 🇮🇹";
  } else if (code == "tr") {
    return "Turkish 🇹🇷";
  } else if (code == "ko") {
    return "Korean 🇰🇷";
  } else if (code == "ja") {
    return "Japanese 🇯🇵";
  } else if (code == "hi") {
    return "Hindi 🇮🇳";
  } else if (code == "sq") {
    return "Albanian 🇦🇱";
  } else if (code == "sv") {
    return "Swedish 🇸🇪";
  }
};

/* ----- DB Qrs ----- */
async function createUser(user) {
  const { data, error } = await supabase
      .from('users')
      .insert([ user ]);

    if (error) {
      throw new Error('Error creating user : ', error);
    } else {
      return data
    }
};

async function updateUser(id, update) {
  const { data, error } = await supabase
    .from('users')
    .update( update )
    .eq('uid', id);

    if (error) {
      throw new Error('Error updating user : ', error);
    } else {
      return data
    }
};

/* ----- HANDELS ----- */

const onMessage = async (senderId, message) => {
  const { user, error } = await supabase
    .from('users')
    .select('uid')
    .eq('uid', senderId);    
    if (error) {
      console.log("DB Err : ", error)
    };
    /* ---- */
    if (message.message.text) {
      if (user.length != 0) {
        axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${user.main}&dt=t&q=${message.message.text}`)
        .then (({ data }) => {
          if (user.main == data[2]) {
            axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${user.sub}&dt=t&q=${message.message.text}`)
        .then (({ data }) => {
          let text = "";
          data[0].forEach(element => {
            text += '\n' + element[0];
          });
          botly.sendText({id: senderId, text: text,
            quick_replies: [
              botly.createQuickReply("تغيير اللغة 🇺🇲🔄", "ChangeLang")]});
        }, error => {
          console.log(error)
        })
          } else {
            let text = "";
            data[0].forEach(element => {
              text += '\n' + element[0];
            });
            botly.sendText({id: senderId, text: text,
              quick_replies: [
                botly.createQuickReply("تغيير اللغة 🇺🇲🔄", "ChangeLang")]});
              }
        }, error => {
          console.log(error)
        })
        } else {
          await createUser({uid: senderId, main: "ar", sub: "en" })
          .then((data, error) => {
            // data[2] => detect
            axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${message.message.text}`)
            .then (({ data }) => {
              let text = "";
              data[0].forEach(element => {
              text += '\n' + element[0];
            });
            botly.sendText({id: senderId, text: text,
              quick_replies: [
                botly.createQuickReply("تغيير اللغة 🇺🇲🔄", "ChangeLang")]});
              }, error => { console.log(error) })
              });
        }
      } else if (message.message.attachments[0].payload.sticker_id) {
        //botly.sendText({id: senderId, text: "(Y)"});
      } else if (message.message.attachments[0].type == "image") {
        botly.sendText({id: senderId, text: "لايمكننا ترجمة الصور 📷 بعد! إستعمل النصوص فقط 🤠"});
      } else if (message.message.attachments[0].type == "audio") {
        botly.sendText({id: senderId, text: "لا يمكنني ترجمة الصوت للأسف! إستعمل النصوص فقط 😐"});
      } else if (message.message.attachments[0].type == "video") {
        botly.sendText({id: senderId, text: "أنا غير قادر على ترجمة الفيديوهات 🎥! إستعمل النصوص فقط 🤠"});
      }

};
/* ----- POSTBACK ----- */

const onPostBack = async (senderId, message, postback) => {
  const { user, error } = await supabase
    .from('users')
    .select('uid')
    .eq('uid', senderId);    
    if (error) {
      console.log("DB Err : ", error)
    };
    /* ---- */
    if (message.postback){ // Normal (buttons)
      if (postback == "GET_STARTED"){
      } else if (postback == "ChangeLang") {
        botly.sendText({id: senderId, text: `أنت تتحدث ${langbtn(user.main)} و يتم ترجمة كلامك إلى ${langbtn(user.sub)} 😀 \nإذا اردت تغيير الخيارات إضغط على أحد الازر 👇🏻`,
          quick_replies: [
            botly.createQuickReply(langbtn(user.main), "SetMain"),
            botly.createQuickReply(langbtn(user.sub), "SetSub")]});
      } else if (postback == "SetSub") {
      } else if (postback == "OurBots") {
        botly.sendText({id: senderId, text: `مرحبا 👋\nيمكنك تجربة كل الصفحات التي أقدمها لكم 👇 إضغط على إسم أي صفحة للتعرف عليها و مراسلتها 💬 كل الصفحات تعود لصانع واحد و كل ماتراه أمامك يُصنع بكل حـ💜ـب و إهتمام في ليالي الارض الجزائرية.\n• ${quote.quotes()} •`,
        quick_replies: [
           botly.createQuickReply("كالربوت 📞", "callerbot"),
           botly.createQuickReply("شيربوت 🌙", "sharebot"),
           botly.createQuickReply("بوتباد 📖", "bottpad"),
           botly.createQuickReply("ترجمان 🌍", "torjman"),
           botly.createQuickReply("بوتيوب ↗️", "botube"),
           botly.createQuickReply("كيوبوت 🐱", "qbot"),
           botly.createQuickReply("سمسمي 🌞", "simsimi")]});
      }
    } else { // Quick Reply
      if (message.message.text == "tbs") {
          //
      } else if (postback == "SetMain") {
        botly.send({
          "id": senderId,
          "message": {
          "text": "من فضلك إختر لغتك الأساسية 🔁🌐",
          "quick_replies":[
            {
              "content_type":"text",
              "title":"Arabic 🇩🇿",
              "payload":"ar",
            },{
              "content_type":"text",
              "title":"English 🇺🇸",
              "payload":"en",
            },{
              "content_type":"text",
              "title":"French 🇫🇷",
              "payload":"fr",
            },{
              "content_type":"text",
              "title":"German 🇩🇪",
              "payload":"de",
            },{
              "content_type":"text",
              "title":"Spanish 🇪🇸",
              "payload":"es",
            },{
              "content_type":"text",
              "title":"Russian 🇷🇺",
              "payload":"ru",
            },{
              "content_type":"text",
              "title":"Italian 🇮🇹",
              "payload":"it",
            },{
              "content_type":"text",
              "title":"Turkish 🇹🇷",
              "payload":"tr",
            },{
              "content_type":"text",
              "title":"Korean 🇰🇷",
              "payload":"ko",
            },{
              "content_type":"text",
              "title":"Japanese 🇯🇵",
              "payload":"ja",
            },{
              "content_type":"text",
              "title":"Hindi 🇮🇳",
              "payload":"hi",
            },{
              "content_type":"text",
              "title":"Albanian 🇦🇱",
              "payload":"sq",
            },{
              "content_type":"text",
              "title":"Swedish 🇸🇪",
              "payload":"sv",
            }
          ]
        }
        });
      } else if (postback == "SetSub"){
        botly.send({
          "id": senderId,
          "message": {
          "text": "من فضلك إختر اللغة الثانوية التي تريد ان اترجم لك لها 🔁🌐",
          "quick_replies":[
            {
              "content_type":"text",
              "title":"Arabic 🇩🇿",
              "payload":"sub-ar",
            },{
              "content_type":"text",
              "title":"English 🇺🇸",
              "payload":"sub-en",
            },{
              "content_type":"text",
              "title":"French 🇫🇷",
              "payload":"sub-fr",
            },{
              "content_type":"text",
              "title":"German 🇩🇪",
              "payload":"sub-de",
            },{
              "content_type":"text",
              "title":"Spanish 🇪🇸",
              "payload":"sub-es",
            },{
              "content_type":"text",
              "title":"Russian 🇷🇺",
              "payload":"sub-ru",
            },{
              "content_type":"text",
              "title":"Italian 🇮🇹",
              "payload":"sub-it",
            },{
              "content_type":"text",
              "title":"Turkish 🇹🇷",
              "payload":"sub-tr",
            },{
              "content_type":"text",
              "title":"Korean 🇰🇷",
              "payload":"sub-ko",
            },{
              "content_type":"text",
              "title":"Japanese 🇯🇵",
              "payload":"sub-ja",
            },{
              "content_type":"text",
              "title":"Hindi 🇮🇳",
              "payload":"sub-hi",
            },{
              "content_type":"text",
              "title":"Albanian 🇦🇱",
              "payload":"sub-sq",
            },{
              "content_type":"text",
              "title":"Swedish 🇸🇪",
              "payload":"sub-sv",
            }
          ]
        }
        });
      } else if (postback == "callerbot") {
        botly.sendGeneric({id: senderId, elements: {
           title: "CallerBot - كالربوت",
           image_url: "https://i.ibb.co/gM5pKr4/gencallerbot.png",
           subtitle: "صفحة ترسل لها اي رقم هاتف و ستبحث لك عن صاحب هذا الرقم",
           buttons: [
              botly.createWebURLButton("على الماسنجر 💬", "m.me/CallerBot/"),
              botly.createWebURLButton("على الفيسبوك 🌐", "facebook.com/CallerBot/"),
              botly.createWebURLButton("حساب الصانع 🇩🇿", "facebook.com/100026129650984/")]},
            aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL});
       } else if (postback == "sharebot"){
        botly.sendGeneric({id: senderId, elements: {
           title: "ShareBot - شيربوت",
           image_url: "https://i.ibb.co/2nSB6xx/gensharebot.png",
           subtitle: "صفحة لتحميل الفيديوهات من التيك توك بدون علامة او الريلز و فيديوهات الفيسبوك",
           buttons: [
              botly.createWebURLButton("على الماسنجر 💬", "m.me/ShareBotApp/"),
              botly.createWebURLButton("على الفيسبوك 🌐", "facebook.com/ShareBotApp/"),
              botly.createWebURLButton("حساب الصانع 🇩🇿", "facebook.com/100026129650984/")]},
            aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL});
       } else if (postback == "bottpad"){
        botly.sendGeneric({id: senderId, elements: {
           title: "Bottpad - بوتباد",
           image_url: "https://i.ibb.co/RBQZbXG/genbottpad.png",
           subtitle: "صفحة تجلب لك روايات من واتباد و ترسلها لك لكي تقرأها على الفيسبوك",
           buttons: [
              botly.createWebURLButton("على الماسنجر 💬", "m.me/Bottpad/"),
              botly.createWebURLButton("على الفيسبوك 🌐", "facebook.com/Bottpad/"),
              botly.createWebURLButton("حساب الصانع 🇩🇿", "facebook.com/100026129650984/")]},
            aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL});
       } else if (postback == "torjman") {
        botly.sendGeneric({id: senderId, elements: {
           title: "Torjman - Translation Bot",
           image_url: "https://i.ibb.co/hCtJM06/gentorjman.png",
           subtitle: "صفحة ترجمة تدعم 13 لغة مختلفة تساعدك على ترجمة النصوص بشكل فوري",
           buttons: [
              botly.createWebURLButton("على الماسنجر 💬", "m.me/TorjmanBot/"),
              botly.createWebURLButton("على الفيسبوك 🌐", "facebook.com/TorjmanBot/"),
              botly.createWebURLButton("حساب الصانع 🇩🇿", "facebook.com/100026129650984/")]},
            aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL});
       } else if (postback == "botube") {
        botly.sendGeneric({id: senderId, elements: {
           title: "Botube - بوتيوب",
           image_url: "https://i.ibb.co/jvt0t0B/genbotube.png",
           subtitle: "صفحة تبحث بها على اليوتيوب و ترسل لك فيديوهات يمكنك مشاهدتها و الاستماع لها",
           buttons: [
              botly.createWebURLButton("على الماسنجر 💬", "m.me/BotubeApp/"),
              botly.createWebURLButton("على الفيسبوك 🌐", "facebook.com/BotubeApp/"),
              botly.createWebURLButton("حساب الصانع 🇩🇿", "facebook.com/100026129650984/")]},
            aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL}); 
       } else if (postback == "qbot") {
        botly.sendGeneric({id: senderId, elements: {
           title: "كيوبوت - QBot",
           image_url: "https://i.ibb.co/Fx7kGFj/genqbot.png",
           subtitle: "صفحة يمكنك التحدث لها مثل الانسان بكل حرية و مناقشة معاها المواضيع التي تريدها",
           buttons: [
              botly.createWebURLButton("على الماسنجر 💬", "m.me/QBotAI/"),
              botly.createWebURLButton("على الفيسبوك 🌐", "facebook.com/QBotAI/"),
              botly.createWebURLButton("حساب الصانع 🇩🇿", "facebook.com/100026129650984/")]},
            aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL});
       } else if (postback == "simsimi") {
        botly.sendGeneric({id: senderId, elements: {
           title: "سمسمي الجزائري - Simsimi Algerian",
           image_url: "https://i.ibb.co/DkdLSSG/gensimsimi.png",
           subtitle: "صفحة للمرح فقط تقوم بالرد على رسائلك بشكل طريف تتحدث باللهجة الجزائرية فقط",
           buttons: [
              botly.createWebURLButton("على الماسنجر 💬", "m.me/SimsimiAlgerian/"),
              botly.createWebURLButton("على الفيسبوك 🌐", "facebook.com/SimsimiAlgerian/"),
              botly.createWebURLButton("حساب الصانع 🇩🇿", "facebook.com/100026129650984/")]},
            aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL});
       } else {
        if(postback.startsWith("sub")) {
          let lnCode = postback.split("-");
          await updateUser(senderId, {sub: lnCode[1] })
          .then((data, error) => {
            if (error) {
              botly.sendText({id: senderId, text: "حدث خطأ"});
            }
            botly.sendText({id: senderId, text: "تم تغيير اللغة بنجاح 😀🌍"});
          });
        } else {
          await updateUser(senderId, {main: postback })
          .then((data, error) => {
            if (error) {
              botly.sendText({id: senderId, text: "حدث خطأ"});
            }
            botly.sendText({id: senderId, text: "تم حفظ اللغة بنجاح 😀🌍"});
          });
        }
        
       }
    }
};
/* ----- HANDELS ----- */
app.listen(3000, () => console.log(`App is on port : 3000`));