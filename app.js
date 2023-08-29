require("dotenv").config();
const express = require("express");
const app = express();
var cors = require("cors");
var bodyParser = require("body-parser");
var mongoose = require('mongoose')
const schedule = require('node-schedule');
var moment = require('moment'); // require
const IS_TEST_MODE = process.env.IS_TEST_MODE;



var {placeOrderToBroker,cancelOpenOrder,getCandles} = require('./services/apiService');
var {kiteHandShake,getHistoricalData,placeOrder,checkOrderExecutedOrNot,} = require('./services/kiteService');
var {stopTicker,startTicker} = require('./controllers/ticker');
var PlacedOrder = require('./model/PlacedOrder');





// var bankniftyData = require("./datas/banknifty");
// var {data} = require("./datas/bnTest");
 var {data} = require("./datas/realTest");

var userRouter = require('./router/user');
var testRouter = require('./router/test');
var kiteRouter = require('./router/kite');
var tickerRouter = require('./router/ticker');


var Core = require('./services/CoreLogic');
var Trade = require('./model/Trade');
var User = require('./model/user');




app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse application/json
app.use(bodyParser.json());

let mongoUrl = IS_TEST_MODE != 'YES' ? process.env.MONGODB_PROD : process.env.MONGODB_UAT

mongoose.connect(mongoUrl, {
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
app.use("/api/v1/ticker", tickerRouter);





app.listen(process.env.PORT || 3000, () => {
  //mailer.pingMailServer();
  // mailer.sendMail("Hello World");
  console.log(`Server running at :${3000}`);
  console.log(`Doctor Backend running environment is ${process.env.NODE_ENV}`);
});



const DailyMarketWatch = require('./model/DailyMarketWatch');

const months = ['JAN',"FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const nseHolidays = [{month: 'SEP',date: 19},{month: 'OCT',date: 2},{month: 'OCT',date: 24},{month: 'NOV',date: 14},{month: 'NOV',date: 27},{month: 'DEC',date: 25}]; 

//To Track holiday
let isHoliday = () => {
  const todayDate = moment().date();
  const todayMonth = moment().month();
  const day = moment().day()
  let holiday = false;

  if(day == 0 || day == 6) return true; //To handle saturday and sunday

  nseHolidays.forEach((hol) => {
    if(months[todayMonth] == hol.month){
      if(hol.date == todayDate){
        holiday =  true;
      }
    }
  })

  return holiday

}

//Run on every 5 mins
var event = schedule.scheduleJob("4 */5 * * * *", async function() {
  try {
    let holiday = isHoliday();
    if(holiday) {
      console.log("Today is hoilday or Weekend so no Trade. Happy holiday :-)");
      return
    }
    console.log("Requesting Candle for Every 5 mins:" ,moment().format())
    let startTime = moment().set({ hour:9, minute:20 });
    let endTime = moment().set({ hour:15, minute:25 });
    let dateNow = moment();
    if(dateNow.format() > startTime.format() && dateNow.format() < endTime.format() ){
      console.log('Time started:',moment());
      let user = await User.findOne({email: process.env.ADMIN_MAIL})
      let candles = await getCandles(moment().format('YYYY-MM-DD'),user.token,user.instrumentId,user.brokerUserId);

      console.log("Current Candle and time are same:",dateNow.format() == moment(candles[candles.length -1][0]).format())

      if((moment().hours() + moment().minute()) == (moment(candles[candles.length -1][0]).hours() + moment(candles[candles.length -1][0]).minute())) {
        candles.pop()
      }
      // if(dateNow.format() == moment(candles[candles.length -1][0]).format()){
      //   candles.pop()
      // }


      console.log("Last Candle",candles[candles.length -1]);
      for(let i = 0; i < candles.length; i++){
        await Core.mainFunction(candles[i]);
      }
      //Run Every 10 seconds to check is order executed or not
      // if(IS_TEST_MODE != 'YES'){
      //   interval = setInterval(async() => {
      //     await checkOrderExecutedOrNot()
      //   //Check the exection order and update the data accordingly
      //   },7000)
      // }

    } 
  } catch (error) {
    console.log("Main function check if any error happens:",error)
  }


});

// var checkOrderStatus = schedule.scheduleJob("0 */1 * * * *", async function() {
//   try {
//       if(IS_TEST_MODE != 'YES'){
//         let startTime = moment().set({ hour:9, minute:20 });
//         let endTime = moment().set({ hour:15, minute:25 });
//         let dateNow = moment();
//         if(dateNow.format() > startTime.format() && dateNow.format() < endTime.format() ){
//           await checkOrderExecutedOrNot()
//           //Check the exection order and update the data accordingly
//         }
       
//       }
//   } catch (error) {
//     console.log('ERror happend in check order status call function',error)
//   }
// });



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
    console.log("Error happend in cleanup token from user function: ",error)
  }
});

async function startTickerFun (){
  try {
    let placedOrder = await PlacedOrder.find({date: moment().format('YYYY-MM-DD'),orderStatus: "NOT-TRIGGERED"});
    if(placedOrder.length > 0) await startTicker();
    else await stopTicker();
  } catch (error) {
    console.log(error)
  }
  
}
startTickerFun()



// startTicker()
//placeOrderToBroker("SELL",256.30,123123123123,'64c9d71ad3f57fff84d83d7d',true,moment().format('YYYY-MM-DD'),false);

//To add new instrument update the following column in user table
//tradingSymbol,instrumentId,tradingQuantity
// And update buSellDiff in core.Mainfunction



















// async function createUser() {
//   let newUser = await new User();
//   newUser.subscriptionStatus= false,
//   newUser.isActive= true,
//   newUser.isAdmin = true,
//   newUser.brokerUserId=  'WB5864',
//   newUser.tradingQuantity = 1,
//   newUser.name = "Karthik raj",
//   newUser.email= "colkar99@gmail.com"
//   newUser.phone = "8056756218",
//   newUser.phoneCode = "+91",
//   newUser.tradingSymbol = "PFC",
//   newUser.password = "colkar.99"
//   newUser.token = "enctoken iXGxGImIRsOj92sF+Df3xrnFxuOlqacXY8PEerAMqlYB8ly1xJIsEEPE2EpTI08r65OwEf4jpCs6R0xTI3Eq2l8zZ4NG/9ScS0bl1jAWuNzd+3vBCpoUTg==",
//   newUser.instrumentId = "3660545",



//   newUser.save()
//   console.log("User",newUser)
// }

// createUser()
