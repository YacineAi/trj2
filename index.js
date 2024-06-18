const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const Botly = require("botly");
const quote = require('./quotes');
const axios = require("axios");
const https = require("https");
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

app.get('/ping', (req, res) => { res.status(200).json({ message: 'Ping successful' }); });

function keepAppRunning() {
  setInterval(() => {
      https.get(`${process.env.RENDER_EXTERNAL_URL}/ping`, (resp) => {
          if (resp.statusCode === 200) {
              console.log('Ping successful');
          } else {
              console.error('Ping failed');
          }
      });
  }, 5 * 60 * 1000);
};

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
    return "العربية 🇩🇿";
  } else if (code == "en") {
    return "الأنجليزية 🇺🇸";
  } else if (code == "fr") {
    return "الفرنسية 🇫🇷";
  } else if (code == "de") {
    return "الألمانية 🇩🇪";
  } else if (code == "es") {
    return "الإسبانية 🇪🇸";
  } else if (code == "ru") {
    return "الروسية 🇷🇺";
  } else if (code == "it") {
    return "الإيطالية 🇮🇹";
  } else if (code == "tr") {
    return "التركية 🇹🇷";
  } else if (code == "ko") {
    return "الكورية 🇰🇷";
  } else if (code == "ja") {
    return "اليابانية 🇯🇵";
  } else if (code == "hi") {
    return "الهندية 🇮🇳";
  } else if (code == "sq") {
    return "الألبانية 🇦🇱";
  } else if (code == "sv") {
    return "السويدية 🇸🇪";
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

async function userDb(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('uid', userId);

  if (error) {
    console.error('Error checking user:', error);
  } else {
    return data
  }
};

/* ----- HANDELS ----- */

const onMessage = async (senderId, message) => {
  
    /* ---- */
    if (message.message.text) {
      const user = await userDb(senderId);
      if (user[0]) {
        axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${user[0].main}&dt=t&q=${message.message.text}`)
        .then (({ data }) => {
          if (user[0].main == data[2]) {
            axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${user[0].sub}&dt=t&q=${message.message.text}`)
        .then (({ data }) => {
          let text = "";
          data[0].forEach(element => {
            text += '\n' + element[0];
          });
          botly.sendText({id: senderId, text: text + "\n\n\nهذه ترجمة من Lingex Bot 💬.",
            quick_replies: [
              botly.createQuickReply("تغيير اللغة 🇺🇲🔄", "ChangeLang"),
              botly.createQuickReply("النطق 🗣️", "xxx")]});
        }, error => {
          console.log(error)
        })
          } else {
            let text = "";
            data[0].forEach(element => {
              text += '\n' + element[0];
            });
            botly.sendText({id: senderId, text: text + "\n\n\nهذه ترجمة من Lingex Bot 💬.",
              quick_replies: [
                botly.createQuickReply("تغيير اللغة 🇺🇲🔄", "ChangeLang"),
                botly.createQuickReply("النطق 🗣️", "xxx")]});
              }
        }, error => {
          console.log(error)
        })
        } else {
          await createUser({uid: senderId, main: "ar", sub: "en" })
          .then((data, error) => {
            botly.send({
              "id": senderId,
              "message": {
              "text": "مرحبا بك في ترجمان 💜\nيبدو أنك مستعمل جديد 😁 مرحبا بك في صفحتك عزيزي 🤗\n- إذا كنت تعرف كيفية إستعمال ترجمان 📲 فأنت جاهز ☑️👌🏻. أما في حالة ما كنت لا تعرف كيفية إستعمال الصفحة دعني أشرح لك 😀",
              "quick_replies":[
                {
                  "content_type":"text",
                  "title":"كيفية الإستعمال 🤔",
                  "payload":"step1",
                }
              ]
            }
            });
          });
        }
      } else if (message.message.attachments[0].payload.sticker_id) {
        //botly.sendText({id: senderId, text: "(Y)"});
      } else if (message.message.attachments[0].type == "image") {
        const user = await userDb(senderId);
        if (user[0]) {
          axios.get(`https://ocrx-1-v4293320.deta.app/image?url=${message.message.attachments[0].payload.url}`)
        .then(({ data }) => {
          if(data.result != "NO TEXT") {
            axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${user[0].main}&dt=t&q=${data.result}`)
        .then (({ data }) => {
          if (user[0].main == data[2]) {
            axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${user[0].sub}&dt=t&q=${data.result}`)
        .then (({ data }) => {
          let text = "";
          data[0].forEach(element => {
            text += '\n' + element[0];
          });
          botly.sendText({id: senderId, text: text + "\n\n\nهذه ترجمة من Lingex Bot 💬.",
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
            botly.sendText({id: senderId, text: text + "\n\n\nهذه ترجمة من Lingex Bot 💬.",
              quick_replies: [
                botly.createQuickReply("تغيير اللغة 🇺🇲🔄", "ChangeLang")]});
              }
        }, error => {
          console.log(error)
        })
          } else {
            botly.sendText({id: senderId, text: "لا يوجد نص بالصورة!"});
          }
          
        });
        } else {
          await createUser({uid: senderId, main: "ar", sub: "en" })
          .then((data, error) => {
            botly.send({
              "id": senderId,
              "message": {
              "text": "مرحبا بك في ترجمان 💜\nيبدو أنك مستعمل جديد 😁 مرحبا بك في صفحتك عزيزي 🤗\n- إذا كنت تعرف كيفية إستعمال ترجمان 📲 فأنت جاهز ☑️👌🏻. أما في حالة ما كنت لا تعرف كيفية إستعمال الصفحة دعني أشرح لك 😀",
              "quick_replies":[
                {
                  "content_type":"text",
                  "title":"كيفية الإستعمال 🤔",
                  "payload":"step1",
                }
              ]
            }
            });
          });
        }
      } else if (message.message.attachments[0].type == "audio") {
        botly.sendText({id: senderId, text: "لا يمكنني ترجمة الصوت للأسف! إستعمل النصوص فقط 😐"});
      } else if (message.message.attachments[0].type == "video") {
        botly.sendText({id: senderId, text: "أنا غير قادر على ترجمة الفيديوهات 🎥! إستعمل النصوص فقط 🤠"});
      }

};
/* ----- POSTBACK ----- */

const onPostBack = async (senderId, message, postback) => {
  const user = await userDb(senderId);
    /* ---- */
    if (user[0]) {
      if (message.postback){ // Normal (buttons)
        if (postback == "GET_STARTED"){
        } else if (postback == "ChangeLang") {
          botly.sendText({id: senderId, text: `أنت تتحدث ${langbtn(user[0].main)} و يتم ترجمة كلامك إلى ${langbtn(user[0].sub)} 😀 \nإذا اردت تغيير الخيارات إضغط على أحد الازر 👇🏻`,
            quick_replies: [
              botly.createQuickReply(langbtn(user[0].main), "SetMain"),
              botly.createQuickReply(langbtn(user[0].sub), "SetSub")]});
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
        if (message.message.text == "النطق 🗣️") {
          botly.sendText({id: senderId, text: "قريبا...."});
        } else if (postback == "ChangeLang") {
          botly.sendText({id: senderId, text: `أنت تتحدث ${langbtn(user[0].main)} و يتم ترجمة كلامك إلى ${langbtn(user[0].sub)} 😀 \nإذا اردت تغيير الخيارات إضغط على أحد الازر 👇🏻`,
          quick_replies: [
            botly.createQuickReply(langbtn(user[0].main), "SetMain"),
            botly.createQuickReply(langbtn(user[0].sub), "SetSub")]});
        } else if (postback == "SetMain") {
          botly.send({
            "id": senderId,
            "message": {
            "text": "من فضلك إختر لغتك الأساسية 🔁🌐",
            "quick_replies":[
              {
                "content_type":"text",
                "title":"العربية 🇩🇿",
                "payload":"ar",
              },{
                "content_type":"text",
                "title":"الأنجليزية 🇺🇸",
                "payload":"en",
              },{
                "content_type":"text",
                "title":"الفرنسية 🇫🇷",
                "payload":"fr",
              },{
                "content_type":"text",
                "title":"الألمانية 🇩🇪",
                "payload":"de",
              },{
                "content_type":"text",
                "title":"الإسبانية 🇪🇸",
                "payload":"es",
              },{
                "content_type":"text",
                "title":"الروسية 🇷🇺",
                "payload":"ru",
              },{
                "content_type":"text",
                "title":"الإيطالية 🇮🇹",
                "payload":"it",
              },{
                "content_type":"text",
                "title":"التركية 🇹🇷",
                "payload":"tr",
              },{
                "content_type":"text",
                "title":"الكورية 🇰🇷",
                "payload":"ko",
              },{
                "content_type":"text",
                "title":"اليابانية 🇯🇵",
                "payload":"ja",
              },{
                "content_type":"text",
                "title":"الهندية 🇮🇳",
                "payload":"hi",
              },{
                "content_type":"text",
                "title":"الألبانية 🇦🇱",
                "payload":"sq",
              },{
                "content_type":"text",
                "title":"السويدية 🇸🇪",
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
                "title":"العربية 🇩🇿",
                "payload":"sub-ar",
              },{
                "content_type":"text",
                "title":"الأنجليزية 🇺🇸",
                "payload":"sub-en",
              },{
                "content_type":"text",
                "title":"الفرنسية 🇫🇷",
                "payload":"sub-fr",
              },{
                "content_type":"text",
                "title":"الألمانية 🇩🇪",
                "payload":"sub-de",
              },{
                "content_type":"text",
                "title":"الإسبانية 🇪🇸",
                "payload":"sub-es",
              },{
                "content_type":"text",
                "title":"الروسية 🇷🇺",
                "payload":"sub-ru",
              },{
                "content_type":"text",
                "title":"الإيطالية 🇮🇹",
                "payload":"sub-it",
              },{
                "content_type":"text",
                "title":"التركية 🇹🇷",
                "payload":"sub-tr",
              },{
                "content_type":"text",
                "title":"الكورية 🇰🇷",
                "payload":"sub-ko",
              },{
                "content_type":"text",
                "title":"اليابانية 🇯🇵",
                "payload":"sub-ja",
              },{
                "content_type":"text",
                "title":"الهندية 🇮🇳",
                "payload":"sub-hi",
              },{
                "content_type":"text",
                "title":"الألبانية 🇦🇱",
                "payload":"sub-sq",
              },{
                "content_type":"text",
                "title":"السويدية 🇸🇪",
                "payload":"sub-sv",
              }
            ]
          }
          });
         } else if (postback == "step1"){
          botly.sendText({id: senderId, text: "بشكل تلقائي 🛡️ يتم تحديد لغتك الخاصة إلى العربية و اللغة التي يتم الترجمة اليها هي الأنجليزية 👌🏻"},
           function (err, data) {
            botly.sendAttachment({
              id: senderId,
              type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
              payload: {
                url: "https://i.ibb.co/NW59dtJ/step1.jpg",
              },
              quick_replies: [
                botly.createQuickReply("التالي ⏪", "step2"),
              ]
            });
           });
         } else if (postback == "step2"){
          botly.sendText({id: senderId, text: "🤗 لا داعي لتغيير اللغة كل مرة. لقد سهلنا الامور عليك.\nالان عند اختيارك للعربية كلغة أساسية و الانجليزية كلغة ثانية 📲 سيتم التبديل بينهما 🔃 بإستعمال خورزميتنا 😁"},
           function (err, data) {
            botly.sendAttachment({
              id: senderId,
              type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
              payload: {
                url: "https://i.ibb.co/YNm9y9P/step2.jpg",
              },
              quick_replies: [
                botly.createQuickReply("التالي ⏪", "step3"),
              ]
            });
           });
         } else if (postback == "step3"){
          botly.sendText({id: senderId, text: "ترجمة الصور تعمل بشكل تلقائي 🤷🏻‍♂️\nيتم ترجمة الصور من أي لغة الى لغتك الأساسية (العربية 🇩🇿)"},
           function (err, data) {
            botly.sendAttachment({
              id: senderId,
              type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
              payload: {
                url: "https://i.ibb.co/ZBsftDb/step3.jpg",
              },
              quick_replies: [
                botly.createQuickReply("التالي ⏪", "step4"),
              ]
            });
           });
         } else if (postback == "step4"){
          botly.sendText({id: senderId, text: "زر النطق 🗣️ يظهر فقط عندما تقوم بترجمة جملة من العربية إلى الأنجليزية أو لغتك الثانية 🌟\nملاحظة! :\nقد يختفي الزر عندما تكون الجملة طويلة نوعا ما 🙄. لقد وضعنا حد 200 حرف لتفادي الاستعمال السيئ للميزة ☑️👌🏻"},
           function (err, data) {
            botly.sendAttachment({
              id: senderId,
              type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
              payload: {
                url: "https://via.placeholder.com/500x300?text=%D8%A7%D9%84%D9%85%D9%8A%D8%B2%D8%A9%20%D8%BA%D9%8A%D8%B1%20%D9%85%D8%AA%D8%A7%D8%AD%D8%A9%20%D8%A8%D8%B9%D8%AF",
              },
              quick_replies: [
                botly.createQuickReply("تم ☑️", "step5"),
              ]
            });
           });
         } else if (postback == "step5"){
          botly.sendAttachment({
            id: senderId,
            type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
            payload: {
              url: "https://i.ibb.co/Dt6bRw8/Screenshot-2023-06-13-01-01-34-749-com-facebook-katana.png",
            },
          },
          function (err, data) {
            botly.sendButtons({id: senderId, text: "إذا وصلت لهذه المرحلة فأنت جاهز لإستعمال ترجمان 😁👌🏻.\nشكرا لإستعمالك للصفحة 🤗🤍\n- إذا أعجبك عملي الخاص و أردت إضافة شيئ مفيد 📲\nراسلني على حسابي أو اترك متابعة 😀 لمعرفة أخر الصفحات التي أقدمها 😇👇🏻",
            buttons: [
              botly.createWebURLButton("حسابي 💻", "https://www.facebook.com/0xNoti")
            ]});
          });
  
         } else if (postback == "6"){
         } else if (postback == "7"){
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
    } else {
      await createUser({uid: senderId, main: "ar", sub: "en" })
          .then((data, error) => {
            botly.send({
              "id": senderId,
              "message": {
              "text": "مرحبا بك في ترجمان 💜\nيبدو أنك مستعمل جديد 😁 مرحبا بك في صفحتك عزيزي 🤗\n- إذا كنت تعرف كيفية إستعمال ترجمان 📲 فأنت جاهز ☑️👌🏻. أما في حالة ما كنت لا تعرف كيفية إستعمال الصفحة دعني أشرح لك 😀",
              "quick_replies":[
                {
                  "content_type":"text",
                  "title":"كيفية الإستعمال 🤔",
                  "payload":"step1",
                }
              ]
            }
            });
          });
    }
};
/* ----- HANDELS ----- */
app.listen(3000, async () => {
    var myip = await axios.get("https://api.ipify.org/");
    console.log(`App is on port : 3000 | IP : ${myip.data}🥳`);
    keepAppRunning();
  });
