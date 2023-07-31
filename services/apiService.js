const axios = require("axios");
const moment = require('moment')
const User = require('../model/user');
const Trade = require('../model/Trade');




exports.getCandles = async(date,token) => {
    return new Promise(async(resolve,reject) => {
        if (!token) return reject({status: 400,message:"Token is missing"});
        const url = `https://kite.zerodha.com/oms/instruments/historical/8963586/5minute?user_id=WB5864&oi=1&from=${date}&to=${date}`;
        const config = {
          headers: {
            authorization: token,
          },
        };
        const response = await axios.get(url, config);
        resolve(response.data.data.candles);
    })
}

exports.getFullCandles = async(date,token) => {
    return new Promise(async(resolve,reject) => {
        if (!token) return reject({status: 400,message:"Token is missing"});
        const url = `https://kite.zerodha.com/oms/instruments/historical/8963586/5minute?user_id=WB5864&oi=1&from=${date}&to=${date}`;
        const config = {
          headers: {
            authorization: token,
          },
        };
        const response = await axios.get(url, config);
        resolve(response.data.data.candles);
    })
}

exports.placeOrderToBroker = async(side,price,referenceId,parentId,isFirstTrade,isLastTrade = false) => {
  return new Promise(async(res,rej) => {
    try {

      let user = await User.findOne({email: 'colkar99@gmail.com'});
      let Trade = createNewTrade();

      if(isFirstTrade || isLastTrade) Trade.quantity = user.tradingQuantity;
      else Trade.quantity = user.tradingQuantity * 2 ;

      Trade.transaction_type = side;
      Trade.trigger_price = price;
      Trade.status = 'ORDER_PLACED';
      Trade.order_date = moment().format('YYYY-MM-DD');
      Trade.market_data_id = parentId;
      Trade.tradingsymbol = user.tradingSymbol;
      Trade.openOrderRefId = referenceId;

      if(side == 'BUY') {
        // Place this order to kite and wait for response
        //if response success save Order Id to existing Trade
        //Save Trade()


        //place buy order
        console.log(`Place Buy Order at: ${price} with Quantity: ${Trade.quantity}`)
        //place sell order
        // Place this order to kite and wait for response
        //if response success save Order Id to existing Trade
        //Save Trade()

        console.log(`Placed Sell Order at: ${price} with Quantity: ${Trade.quantity}`)

      }
      res(true)

    } catch (error) {
      console.log(error);
      rej(error)
    }
  })

}
exports.cancelOpenOrder = async(side,referenceId) => {
  console.log(`Cancelling the  Open Order ${side}`)
}

exports.checkOrderStatusFromBroker = async(side) => {
  if(side == 'BUY') {
    //place buy order
    console.log('Place Buy Order at:', price)
  }else if(side == 'SELL'){
    //place sell order
    console.log('Place Sell Order at:', price)

  }
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

//order Placing and cancelling details
//155 => cancel buy order
//163 => sell order placed
//180 => sell orde placed
//203 => cancel buy order
//227 => TGT buy order exe place SL sell Order(doubt)
//255 SL reached cancel open TGT buy order
//270 SL reached place normal sell order
//279 SL reached place tgt sell order
//338 cancel normal sell order
//349 Place normal buy order
// 360 TGT buy order place
// 385 cancel normal sell order
// 435 SL reached cancel TGT sell order
// 450 SL reached normal buy order placed
// 459 SL reached Place TGT buy order
//486 Sell order placed
//498 TGT sell  order placed
// 542 normal sell order placed
//554 SL reached TGT Sell order placed
//609 Normal sell order placed
//621 TGT buy order placed
//664 SL reached normal sell order placed
//676 SL Reached TGT Buy order placed
// 728 cancel SL Normal sell order
// 788 TGT reached cancel sell order
//960 cancell buy order
