require("dotenv").config();
const express = require("express");
const app = express();
var cors = require("cors");
var bodyParser = require("body-parser");
var mongoose = require('mongoose')
const schedule = require('node-schedule');
var moment = require('moment'); // require

var {placeOrderToBroker,cancelOpenOrder,getCandles} = require('./services/apiService');
var {kiteHandShake,getHistoricalData,placeOrder,checkOrderExecutedOrNot,} = require('./services/kiteService');




// var bankniftyData = require("./datas/banknifty");
// var {data} = require("./datas/bnTest");
 var {data} = require("./datas/realTest");

var userRouter = require('./router/user');
var testRouter = require('./router/test');
var kiteRouter = require('./router/kite');

var Core = require('./services/CoreLogic');
var Trade = require('./model/Trade');
var User = require('./model/user');




app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse application/json
app.use(bodyParser.json());


mongoose.connect(process.env.MONGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async(res) => {
    console.log("db connected successfully")
  })
  .catch((err) => console.log(err));
//////

app.use("/api/v1/user", userRouter);
app.use("/api/v1/test", testRouter);
app.use("/api/v1/kite", kiteRouter);




app.listen(process.env.PORT || 3000, () => {
  //mailer.pingMailServer();
  // mailer.sendMail("Hello World");
  console.log(`Server running at :${3000}`);
  console.log(`Doctor Backend running environment is ${process.env.NODE_ENV}`);
});



const DailyMarketWatch = require('./model/DailyMarketWatch');



//Run on every 5 mins
let interval;
var event = schedule.scheduleJob("2 */5 * * * *", async function() {
  try {
    console.log("Requesting Candle for Every 5 mins:" ,moment().format())
    let startTime = moment().set({ hour:9, minute:25 });
    let endTime = moment().set({ hour:15, minute:25 });
    let dateNow = moment();
    clearInterval(interval);
    if(dateNow.format() > startTime.format() && dateNow.format() < endTime.format() ){
      console.log('Time started:',moment());
      let user = await User.findOne({email: process.env.ADMIN_MAIL})
      let candles = await getCandles(moment().format('YYYY-MM-DD'),user.token,user.instrumentId,user.brokerUserId);

      for(let i = 0; i < candles.length; i++){
        await Core.mainFunction(candles[i]);
      }
      //Run Every 10 seconds to check is order executed or not
      interval = setInterval(async() => {
        await checkOrderExecutedOrNot()
      //Check the exection order and update the data accordingly
      },10000)
    } 
  } catch (error) {
    console.log("Main function check if any error happens:",error)
  }


});

// use this to remove token etc
var event1 = schedule.scheduleJob("0 18 * * *",async function() {
  console.log('This runs every day 6pm hour to clean up tokens');
  try{
    let user = await User.findOne({email: process.env.ADMIN_MAIL});
    if(user){
      user.token = '',
      await user.save();
    }
    let daily = await DailyMarketWatch.findOne({ date: moment().format('YYYY-MM-DD') });
    if(daily) {
    daily.openOrderId = '';
    await daily.save()
    }
    console.log('Cleanup runned successfully');
  } catch(error){
    console.log("Error happend in renove token from user function: ",error)
  }
});




//To add new instrument update the following column in user table
//tradingSymbol,instrumentId,tradingQuantity
// And update buSellDiff in core.Mainfunction



// async function test(){
//   //kiteHandShake();
//   //getHistoricalData(8963586,'5minute',moment().format('YYYY-MM-DD'),moment().format('YYYY-MM-DD'))
//   // 64c7b3355abfba60fba62186
//   //placeOrderTesting()
//  // await placeOrderToBroker('BUY',9,551403430378,'64c7b3355abfba60fba62186',true,moment().format('YYYY-MM-DD'),false)
// // placeOrder("","","","","","","");
//  // await cancelOpenOrder('BUY',230801002391393,'64c7b3355abfba60fba62186')
//  await checkOrderExecutedOrNot();

// }
// test()



























// async function createUser() {
//   let newUser = await new User();
//   newUser.subscriptionStatus= false,
//   newUser.isActive= true,
//   newUser.isAdmin = true,
//   newUser.brokerUserId=  'WB5864',
//   newUser.tradingQuantity = 15,
//   newUser.name = "Karthik raj",
//   newUser.email= "colkar99@gmail.com"
//   newUser.phone = "8056756218",
//   newUser.phoneCode = "+91",
//   newUser.tradingSymbol = "BANKNIFTY23AUGFUT",
//   newUser.password = "colkar.99"

//   newUser.save()
//   console.log("User",newUser)
// }

// createUser()


