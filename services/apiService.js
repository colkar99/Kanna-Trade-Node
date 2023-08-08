const axios = require("axios");
const moment = require('moment')
const User = require('../model/user');
const Trade = require('../model/Trade');
//const DailyMarketWatch = require('../model/DailyMarketWatch');
var {sendMail} = require('./mailerService')

const {placeOrder,cancelOpenOrder} = require('./kiteService');




exports.getCandles = async(date,token,instrumentId,user_id) => {
    return new Promise(async(resolve,reject) => {
        try {
            if (!token) throw {status: 400,message:"Token is missing"};
            const url = `https://kite.zerodha.com/oms/instruments/historical/${instrumentId}/5minute?user_id=${user_id}&oi=1&from=${date}&to=${date}`;
            const config = {
              headers: {
                authorization: token,
              },
            };
            const response = await axios.get(url, config);

            resolve(response.data.data.candles);
        } catch (error) {
            console.log("Error Happend inside getCandles/apiservice:",error)
            reject(error)
            sendMail('getCandles/api service',{date,token,instrumentId,user_id},error)
        }
      
    })
}



exports.placeOrderToBroker = async(side,price,referenceId,parentId,isFirstTrade,date,isLastTrade = false,) => {
  return new Promise(async(res,rej) => {
    try {
      let user = await User.findOne({email: 'colkar99@gmail.com'});
      let Trade = createNewTrade();
      console.log(date)
      if(isFirstTrade == 0 || isLastTrade) Trade.quantity = user.tradingQuantity;
      else Trade.quantity = user.tradingQuantity * 2 ;

      Trade.transaction_type = side;
      Trade.trigger_price = price;
      Trade.status = 'ORDER_PLACED';
      Trade.order_date = moment().format('YYYY-MM-DD');
      Trade.market_data_id = parentId;
      Trade.tradingsymbol = user.tradingSymbol;
      Trade.openOrderRefId = referenceId;
      if(isLastTrade){
        Trade.trigger_price = 0;
        Trade.order_type = "MARKET";
      }
      console.log(Trade);

    let response = await placeOrder(Trade.transaction_type,Trade.tradingsymbol,Trade.quantity,Trade.trigger_price,user.brokerUserId,user.token,Trade.order_type)
    // Response structure { status: 'success', data: { order_id: '230801001341992' } }
    if(response.status == 'success'){
        Trade.status = "ORDER_PLACED";
        Trade.order_id = response.data.order_id;
        await Trade.save();
        // await DailyMarketWatch.findByIdAndUpdate(
        //     { _id: parentId },
        //     {
        //         openOrderId: response.data.order_id,
        //     },
        //     {
        //       new: true,
        //     }
        //   );

    }else if(response.status != 'success') {
        throw {message: 'Error Happend while placing Oreder',error: response}
        // setTimeout(() =>{
        //     placeOrderToBroker(side,price,referenceId,parentId,isFirstTrade,date,isLastTrade = false)
        // } , 5000)
        // rej(false)
    }

    console.warn(`Place ${side} Order at: ${price} with Quantity: ${Trade.quantity} with Trade Order_ID:${Trade.order_id}`)
    res(response.data.order_id);

    } catch (error) {
      console.log("Error Happend inside placeOrderToBroker/apiservice: ",error);
      rej(error)
      sendMail('placeOrderToBroker/apiservice', {side,price,referenceId,parentId,isFirstTrade,date,isLastTrade},error)
    }
  })

}

exports.cancelOpenOrder = async(side,referenceId,parentId) => {
    return new Promise(async(res,rej) =>{
        try {
            console.error(`Cancelling the  Open Order ${side}`)
            let trade = await Trade.findOne({order_id: referenceId});
            let user = await User.findOne({ email: process.env.ADMIN_MAIL });


            let order = await cancelOpenOrder(referenceId,user.token);
            console.log(order);

            if(order.status == 'success'){
            trade.status = 'CANCELLED',
             await trade.save();
            //  await DailyMarketWatch.findByIdAndUpdate(
            //     { _id: parentId },
            //     {
            //         openOrderId: '',
            //     },
            //     {
            //       new: true,
            //     }
            //   );
               
            }else{
              throw {message: 'Error Happend while cancelling the order',error: response}

                // setTimeout(() => {
                //     cancelOpenOrder(side,referenceId,parentId)
                // },5000)
                // rej(false)
                // return
            }
            res(order.status);
        } catch (error) {
            console.log("Error happened inside cancelOpenOrder/apiservice:",error);
            rej(error)
            sendMail('cancelOpenOrder/apiservice', {side,referenceId,parentId},error)
        }
    })
}


let createNewTrade = () => {
  return new Trade({
    // variety: 'regular',
    // order_type: 'SL-M',
    // product: 'MIS',
    // validity: 'DAY',
    // tradingsymbol: 'NSE',
    // order_exe_price: 0,
    // _id: new ObjectId("64c77e20067309335e9388db")
  })
}





