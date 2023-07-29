require("dotenv").config();
const express = require("express");
const app = express();
var cors = require("cors");
var bodyParser = require("body-parser");
var mongoose = require('mongoose')
const schedule = require('node-schedule');
var moment = require('moment'); // require
var token = 'enctoken u0sksXBGmvONdukc+Jut6Xu4ZVOfpjX83Q7S+g8vZb8RqrBK/CfAKOueTXduOyFp3R4Hv1x5Ms6u81UP8FUPNw7RBeqzfYR/1wAFC/comNh+Zv88GZyOxQ==';
var apiService = require('./services/apiService');



// var bankniftyData = require("./datas/banknifty");
 var {data} = require("./datas/bnTest");
var userRouter = require('./router/user');
var testRouter = require('./router/test');
var Core = require('./services/CoreLogic')



app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());


mongoose.connect(process.env.MONGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async(res) => {
    console.log("db connected successfully")

    let interval = setInterval(async() => {
      // for(let i = 0; i < data.length;i++){
      //   const contents = await Core.mainFunction(data[i]);
      //   console.log(contents)
      // }
      try{
        let result = await apiService.getCandles(moment().add(-1 ,'days').format('YYYY-MM-DD'),token)
        console.log(result);
        for(let i = 0; i < result.length;i++){
         const contents = await Core.mainFunction(result[i]);
         console.log(contents)
        }
      }catch(err){
        console.log(err)
      }
    },3000)
    
      
 
  })
  .catch((err) => console.log(err));
//////

app.use("/api/v1/user", userRouter);
app.use("/api/v1/test", testRouter);



app.listen(process.env.PORT || 3000, () => {
  //mailer.pingMailServer();
  // mailer.sendMail("Hello World");
  console.log(`Server running at :${3000}`);
  console.log(`Doctor Backend running environment is ${process.env.NODE_ENV}`);
});

// const job = schedule.scheduleJob('20 9 * * *', function(){
//   //skip for saturday and sunday
//   if(moment().day() == 6 || moment().day() == 0) return;

//   let startTime = moment({ hour:9, minute:20 });
//   let endTime = moment({ hour:15, minute:25 });

//   let interval = setInterval(async() => {
//     console.log('Interval Triggered');
//     if(endTime.format() == moment().format()){

//       clearInterval(interval);
//       console.log("Time up close trade");
//     } 
//   },4000)
// });

let val =moment('2023-07-29T15:25:00+0530').set({ hour:9, minute:25 });
let val2 = moment('2023-07-29T15:25:00+0530');

console.log(val.add(-1,'d'))

