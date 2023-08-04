const axios = require("axios");

const User = require("../model/user");
const DailyMarketWatch = require("../model/DailyMarketWatch");
const Trade = require("../model/Trade");



exports.checkOrderExecutedOrNot = async() => {
    return new Promise(async(res,rej) => {
        try {
            let user = await User.findOne({email: process.env.ADMIN_MAIL});
            if(!user) return rej(new Error("User not found in check order exec function insite kite service"))

            let url = "https://kite.zerodha.com/oms/orders";
            const config = {
                headers: {
                  authorization: user.token,
                },
              };

            const response = await axios.get(url, config);
            let data = response.data.data;
            
            if(data.length != 0){
                for(let i = 0 ; i < data.length; i++){
                    if(data[i].status == 'COMPLETE'){
                        let trade = await Trade.findOne({order_id: data[i].order_id});
                        if(!trade){
                            // console.log("Outside Trades",trade);
                            continue;
                        }
                        // console.log('Inside Trades', trade)
                        trade.status = "COMPLETE";
                        trade.order_exe_price = data[i].average_price;
                        let parentId = trade.market_data_id;
                        await trade.save()
                        await DailyMarketWatch.findByIdAndUpdate(
                            { _id: parentId },
                            {
                                openOrderId: '',
                            },
                            {
                              new: true,
                            }
                          );
                    }
                }
            }
            res(true)
            //console.log('Inside Order Executed or not logic', data);  
        } catch (error) {
            console.log("From Order Exec Function",error);
            rej(error);
        }
    })
}

exports.cancelOpenOrder = async(order_id,token) =>{
    return new Promise(async(res,rej) => {
        try {
            if(!order_id || !token) throw 'Order Id Or Token is required to cancel';
            let url =`https://kite.zerodha.com/oms/orders/regular/${order_id}?order_id=${order_id}&parent_order_id=&variety=regular`;
            const config = {
                headers: {
                  authorization: token,
                },
              };
              const response = await axios.delete(url, config);  
              console.log('Inside cancel Order',response);
              res(response.data);

        } catch (error) {
            console.log(error);
            rej(error)
        }
    })
}

exports.placeOrder = async (side, tradingsymbol,quantity,trigger_price,user_id,token,order_type = "SL-M") => {
  return new Promise(async (resolve, reject) => {
    try {
      if(!side ||  !tradingsymbol || !quantity || !trigger_price || !user_id || !token || !order_type) throw "Bad data error from place order functon";
     
      const url = `https://kite.zerodha.com/oms/orders/regular`;
      const config = {
        headers: {
          authorization: token,
        },
      };
      var data = {
        tradingsymbol: tradingsymbol,
        variety: "regular",
        exchange: "NSE",
        transaction_type: side,
        order_type: order_type,
        quantity: quantity,
        price: 0,
        product: "MIS",
        validity: "DAY",
        trigger_price: trigger_price,
        user_id: user_id,
      };

      const response = await axios.post(url, new URLSearchParams(data), config);

      console.log(response.data); // { status: 'success', data: { order_id: '230801001341992' } }
      resolve(response.data);
    } catch (error) {
      console.log("From kite place Order", error);
      reject(error);
    }
  });
};

