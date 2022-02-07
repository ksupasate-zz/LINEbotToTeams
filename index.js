const axios=require('axios')
const moment = require('moment')
const url=require('url')
webhookMicrosoftTeam=async(json)=>{
 //WEBHOOK_ACCESS_URL ที่ตั้งค่าใน Azure Functions Serverless
 await axios.post(process.env.WEBHOOK_ACCESS_URL,json,{headers:{'Content-Type': 'application/json'}})
}
getProfileLine=async(userId)=>{
 //LINE_CHANNEL_ACCESS_TOKEN ที่ตั้งค่าใน Azure Functions Serverless
 return (await axios({method:'GET',url:'https://api.line.me/v2/bot/profile/'+userId,headers:{'Content-Type':'application/json','authorization':'Bearer '+process.env.LINE_CHANNEL_ACCESS_TOKEN}})).data
}
replyMessage=async(messages,replyToken)=>{
 //LINE_CHANNEL_ACCESS_TOKEN ที่ตั้งค่าใน Azure Functions Serverless
 await axios.post('https://api.line.me/v2/bot/message/reply',{replyToken:replyToken,messages:messages},{headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.LINE_CHANNEL_ACCESS_TOKEN}})
}
getMonth=(month)=>{
 switch(month) {
  case '01':
  return 'มกราคม'
  case '02':
  return 'กุมภาพันธ์'
  case '03':
  return 'มีนาคม'
  case '04':
  return 'เมษายน'
  case '05':
  return 'พฤษภาคม'
  case '06':
  return 'มิถุนายน'
  case '07':
  return 'กรกฎาคม'
  case '08':
  return 'สิงหาคม'
  case '09':
  return 'กันยายน'
  case '10':
  return 'ตุลาคม'
  case '11':
  return 'พฤศจิกายน'
  case '12':
  return 'ธันวาคม'
  default:
  return '-'
 }
}
module.exports=async(context,req)=>{
 //สร้าง Log Trigger เก็บข้อมูล req ที่เข้ามา
 context.log('Trigger',req)
 let event=null,profile={pictureUrl:null,displayName:'จากผู้ใช้งาน LINE'},json={summary:'ข้อความจาก LINE',sections:[]},text=null,message=null,typeMessage=null,section={},time=null,channel=null
 //วนตรวจสอบ Events ที่เข้ามาใน Function
 for(event of req.body.events){
  message=event.message
  typeMessage=message.type
  //ตรวจสอบว่าข้อความที่เข้ามาเป็นรูปแบบ Text ไหม ถ้าใช่ให้ทำกระบวนการถัดไปถ้าไม่ใช่ให้ผ่านไป
  if(typeMessage==='text'){
   text=message.text
   //ถ้าพบคำที่เกี่ยวข้องที่มีคำว่า @ทีมพัฒนา ไหม ถ้าใช่ให้ทำกระบวนการถัดไปถ้าไม่ใช่ให้ผ่านไป
   if(text.includes('@ทีมพัฒนา')){
    //กรณีที่ทาง User ใน LINE ยังไม่ได้เพิ่ม BOT เป็นเพื่อนจะไม่ได้ข้อมูล User Id ของผู้ใช้มาดังนั้นหากมีการดึงข้อมูล Profile ให้เขียนดักไว้
    if(event.source.userId){
     //ดึงข้อมูล Profile ของผู้ใช้งาน Line
     profile=await getProfileLine(event.source.userId)
    }
    //เก็บข้อมูล timestamp ณ ตอนผู้ใช้งานพิมพ์เข้ามา
    time=event.timestamp
    //ตรวจสอบการส่งข้อความว่ามาจากการส่งที่ใด
    switch(event.source.type){
     case 'user':
     channel=' (ส่วนตัว)'
     break
     case 'group':
     channel=' (กลุ่ม)'
     break
     default:
     channel=' (ห้อง)'
     break
    }
    //กำหนดรูปแบบที่จะส่งให้ Incoming Webhook ใน Microsoft Teams
    section={
     activityTitle:'',
     activityImage: profile.pictureUrl,
     facts:[],
     markdown:true
    }
    //ตรวจสอบว่ามีรูปผู้ใช้งานไหมหากมีให้ทำการกำหนด
    if(profile.pictureUrl!=null){
     section.activityTitle='![TestImage]('+profile.pictureUrl+')'
    }
    //จัดรูปแบบของช่วงเวลาที่ผู้ใช้งานพิมพ์เข้ามา
    section.activitySubtitle='วันที่'+moment(time).format('DD')+' เดือน'+(await getMonth(moment(time).format('MM')))+' '+moment(time).format('YYYY')+' เวลา: '+moment(time).format('HH:mm')
    //กำหนดรายละเอียดของข้อความที่จะส่งให้ Incoming Webhook ใน Microsoft Teams
    json.summary='ข้อความจาก '+profile.displayName+channel
    section.facts.push({name:'ข้อความ',value:text})
    section.activityTitle=section.activityTitle+json.summary
    json.sections=[section]
    //ทำการส่งข้อความให้ Incoming Webhook ใน Microsoft Teams
    await webhookMicrosoftTeam(json)
    //ทำการส่งข้อความยืนยันกลับไปยังผู้ใช้งานทาง LINE
    await replyMessage([{
     type: 'text',
     text: 'ระบบส่งข้อมูลไปยัง Team เรียบร้อย'
    }],event.replyToken)
   }
  }
 }
 context.done()
}