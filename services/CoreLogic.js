
var moment = require('moment'); // require

const {getCandles,getFullCandle,placeOrderToBroker,checkOrderStatusFromBroker,cancelOpenOrder} = require('./apiService')
const DAYS = ['sunday','monday','tuesday','wednesday','thrusday','friday','saturday'];
const DailyMarketWatch = require('../model/DailyMarketWatch');
const startTime = '09:30:00+0530';
const endTime = '15:15:00+0530';
const reached = false;
const today = new Date();
const token = 'enctoken 8TvIi2vchLg1bvBJrYmXmLEEe+L3hSkZfBjrZZokWLktHcLqELIwKMdj7c1lNFh+WyjM2qP+eJdVjr6XHmO8fvhsiistbF2n9P0o5zDRtKQzP5GMIFBsOw==';
const lastCandelTime = new Date();
const isOwnData = false;

//////////////////////////////////
const buySellDiff = 45;
const buySide  = [6, 7, 10, 11, 12, 13];
const sellSide = [8, 9, 14, 15, 16, 17];




exports.mainFunction = async(data) => {
  return new Promise(async(res,rej) =>{
    try {

      //let day = new Date(data[0]);
      let day = moment(data[0]);
     

      // if(DAYS[day.getDay()] != 'sunday' || DAYS[day.getDay()] != 'saturday' ){
        // let startTime = new Date(data[0]).setHours(9,30,0,0);
        // let endTime = new Date(data[0]).setHours(15,15,0,0);
        let startTime = moment(data[0]).set({ hour:9, minute:30 });
        let endTime = moment(data[0]).set({ hour:15, minute:15 });

        //console.log(data[0])
        // console.log('Start Date:', day.getTime() > startTime);
        // console.log('End Date:',  day.getTime() < endTime);
        // return
        if(day.format() == endTime.format()){
          // Close Trade
          await closeTrade(data)
          return res(true)

        }

        if(day.format() > startTime.format() && day.format() < endTime.format() ){
          
          if(day.get('minute') % 5 == 0) {


            //console.log(day.getMinutes());
            let MB = await DailyMarketWatch.findOne({date: day.format('YYYY-MM-DD')});
            //console.log(MB)
            if(MB == null){
            MB = createNewMB();
            MB.date = day.format('YYYY-MM-DD')
            }
            //console.log(MB)
            if(MB.tradeEnd) {
              console.log("Trade already ended for the day")
              return res(true)
            }
            if(MB.lastCandleTimeStamp != "" && moment(MB.lastCandleTimeStamp).format() > day.format()){
              return res(true)
            }
            
            MB.lastCandleTimeStamp = data[0];

            //console.log(MB)

            await coreLogic(data,MB);
            //console.log("Last",MB);
  
            await MB.save()
            return res(true)
          } 
        }
        res(true)
       //}

  } catch (error) {
      console.log(error)
      rej(true)
  }
  })

 
  
}

//Helper Methods 



let coreLogic = async (data,MB) => {
  
  return new Promise(async(res,rej) => {
    try {
      if(!MB.tradeStarted){
        MB.open = data[1];
        MB.high = data[2];
        MB.allHigh = data[2];
        MB.low = data[3];
        MB.allLow = data[3];
        MB.tradeStarted = true;
        setUpperBandAndLowerBand(data,MB);
        return res(true);
       }
      switch (MB.status) {
      case 1: {
        //No Trade
        checkToPlaceOrder(data,MB);
        break;
      }
      case 2: {
        //Normal Buy placed
        //check  high crossed trade price
        if (data[2] >= MB.priceToTrade) {
          //exec Order
          MB.isFirstTrade = false;
          MB.status = 6;
          MB.comments.push(
            `Normal Buy Order EXEC at ${MB.priceToTrade.toFixed(
              2
            )} ${getTimeForComment(data)}`
          );
          MB.executedTradeCount += 1;
          MB.trades.push({
            side: 'BUY',
            exec: MB.priceToTrade,
            isLast: false,
          })
          checkOrderStatusFromBroker('BUY')
          // buy_order_executed
          //new High
          if (data[2] > MB.high) {
            MB.comments.push(
              `New High(${data[2].toFixed(
                2
              )}) Band Revise at ${getTimeForComment(data)}`
            );
            MB.high = data[2];
            MB.allHigh = data[2];
            setUpperBandAndLowerBand(data,MB);
          }
          return res(true);
        }
    
        if (data[3] <= MB.LB) {
          //cancel Buy Order change status to 1
          MB.status = 1;
          MB.comments.push(
            `LB Normal Buy Cancelled at  ${getTimeForComment(data)}`
          );
          cancelOpenOrder('BUY',MB.openOrderId,MB._id)
          //cancel_buy_order
          //Place normal Buy/ Tgt buy order
          if (data[3] <= MB.low) {
            MB.status = 4;
            MB.priceToTrade = data[3] - buySellDiff;
            MB.target = 0;
            MB.stopLoss = 0;
            MB.comments.push(
              `LB Normal Sell Order Placed at ${MB.priceToTrade.toFixed(
                2
              )} ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId();
            
            placeOrderToBroker('SELL',MB.priceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0]);
            //place_sell_order
          } else {
            MB.status = 5;
            MB.priceToTrade = data[3] - buySellDiff;
            setTargetFunction('BUY',MB);
            MB.comments.push(
              `LB TGT SELL Order Placed at${MB.priceToTrade.toFixed(
                2
              )} TGT:${MB.target.toFixed(2)} , SL:${
                MB.stopLoss
              } ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()

            placeOrderToBroker('SELL',MB.priceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,date[0])

            //place_sell_order

          }
    
          if (data[3] <= MB.low) {
            MB.comments.push(
              `New Low(${data[3].toFixed(
                2
              )}) Band Revise at ${getTimeForComment(data)}`
            );
            MB.low = data[3];
            MB.allLow = data[3];
            setUpperBandAndLowerBand(data,MB);
          }
          return res(true);
        }
    
        if (data[3] <= MB.low) {
          //Cancel normal buy order
          MB.status = 1;
          MB.comments.push(
            `New Low(${data[3].toFixed(
              2
            )}) Cancel Normal buy order Band Revise at ${getTimeForComment(
              data
            )}`
          );
          cancelOpenOrder('BUY',MB.openOrderId,MB._id)
          //cancel_buy_order
          MB.low = data[3];
          MB.allLow = data[3];
          setUpperBandAndLowerBand(data,MB);
          //cancel_buy_order
          //set new low
          //set upper and lower band
        }
        //check  Low less than LB
        //cancel Buy Order
        //check new low
        break;
      }
      case 3: {
        // Target Buy Order placed
        //High >= priceTo Trade
        if (data[2] >= MB.priceToTrade) {
          MB.isFirstTrade = false;
          MB.status = 7;
          MB.executedTradeCount += 1;
          MB.comments.push(
            `TGT Buy Order EXEC ${MB.priceToTrade.toFixed(
              2
            )} TGT:${MB.target.toFixed(2)} SL:${MB.stopLoss.toFixed(
              2
            )}  at ${getTimeForComment(data)}`
          );
          //buy_order_executed
          MB.trades.push({
            side: 'BUY',
            exec: MB.priceToTrade,
            isLast: false,
          })
          // trades.push({
          //   side: 'BUY',
          //   exec: MB.priceToTrade,
          //   isLast: false,
          // });
    
          return res(true);
          //update bands and convert to normal order
          //new high >  old high
        }
        // low <= stoploss
        if (data[3] <= MB.stopLoss) {
          //place SL Sell Order
          MB.isFirstTrade = false;
          MB.priceToTrade = data[3] - buySellDiff;
          MB.comments.push(
            `SL Reached cancel TGT Buy Order ${getTimeForComment(data)}`
          );
          cancelOpenOrder('BUY',MB.openOrderId,MB._id)
          //cancel_buy_order
          if (data[3] <= MB.low) {
            //Normal Order
            MB.low = data[3];
            MB.allLow = data[3];
            MB.target = 0;
            MB.stopLoss = 0;
            MB.comments.push(
              `New Low(${data[3]}) at ${getTimeForComment(data)}`
            );
            setUpperBandAndLowerBand(data,MB);
            MB.status = 4;
            MB.comments.push(
              `SL Reached Normall sell order Placed at ${MB.priceToTrade.toFixed(
                2
              )} at ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()

            placeOrderToBroker('SELL',MB.priceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0])
            // place_sell_order
          } else {
            MB.status = 5;
            setTargetFunction('SELL',MB);
            MB.comments.push(
              `SL Reached TGT sell order Placed at ${MB.priceToTrade.toFixed(
                2
              )} TGT${MB.target.toFixed(
                2
              )} sl:${MB.stopLoss.toFixed(
                2
              )} at ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()
            placeOrderToBroker('SELL',MB.priceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0])
            //place_sell_order
            //Target Order
          }
          //check new Low
        }
    
        break;
      }
      case 4: {
        //Normal sell placed
        //check  low crossed trade price
        if (data[3] <= MB.priceToTrade) {
          //exec Order
          MB.isFirstTrade = false;
          MB.status = 8;
          MB.comments.push(
            `Normal sell Order EXEC at ${MB.priceToTrade.toFixed(
              2
            )} ${getTimeForComment(data)}`
          );
          // sell_order_executed
          MB.executedTradeCount += 1;

          MB.trades.push({
            side: 'SELL',
            exec: MB.priceToTrade,
            isLast: false,
          })
          MB.openOrderId = generateUniqId();
          //placeOrderToBroker('SELL',MB.priceToTrade.toFixed(),MB.openOrderId,MB._id,MB.isFirstTrade,data[0]);
          // trades.push({
          //   side: 'SELL',
          //   exec: MB.priceToTrade,
          //   isLast: false,
          // });
    
          //new low
          if (data[3] < MB.low) {
            MB.comments.push(
              `New Low(${data[3].toFixed(
                2
              )}) Band Revise at ${getTimeForComment(data)}`
            );
            MB.low = data[3];
            MB.allLow = data[3];
            setUpperBandAndLowerBand(data,MB);
          }
          return res(true);
        }
        //check  High greater than UB
        if (data[2] >= MB.UB) {
          //cancel Buy Order cnage status to 1
          MB.isFirstTrade = false;
          MB.status = 1;
          MB.comments.push(
            `UB Normal Sell Cancelled at  ${getTimeForComment(data)}`
          );
          cancelOpenOrder('SELL',MB.openOrderId,MB._id)
          //cancel_sell_order
    
          //Place normal Buy/ Tgt buy order
          if (data[2] >= MB.high) {
            MB.status = 2;
            MB.priceToTrade = data[2] + buySellDiff;
            MB.target = 0;
            MB.stopLoss = 0;
            MB.comments.push(
              `UB Normal Buy Order Placed at ${
                MB.priceToTrade
              } ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()
            placeOrderToBroker('BUY',MB.priceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0]);
            //place_buy_order
          } else {
            // console.log("TGT Buy order", data)
            MB.status = 3;
            MB.priceToTrade = data[2] + buySellDiff;
            setTargetFunction('BUY',MB);
            MB.comments.push(
              `UB TGT Buy Order Placed at ${MB.priceToTrade.toFixed(
                2
              )} TGT:${MB.target.toFixed(2)} , SL:${
                MB.stopLoss
              } ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()
            placeOrderToBroker('BUY',MB.priceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0]);
            //place_buy_order
          }
    
          if (data[2] >= MB.high) {
            MB.comments.push(
              `New High(${data[2].toFixed(
                2
              )}) Band Revise at ${getTimeForComment(data)}`
            );
            MB.high = data[2];
            MB.allHigh = data[2];
            setUpperBandAndLowerBand(data,MB);
          }
          return res(true);
        }
    
        if (data[2] >= MB.high) {
          MB.comments.push(
            `New High(${data[2].toFixed(
              2
            )}) Normal Sell Cancelled Band Revise at ${getTimeForComment(
              data
            )}`
          );
          //cancel_sell_order
          MB.status = 1;
          MB.high = data[2];
          MB.allHigh = data[2];
          setUpperBandAndLowerBand(data,MB);
          cancelOpenOrder('SELL',MB.openOrderId,MB._id)
        }
        //cancel Buy Order
        //check new low
        break;
      }
      case 5: {
        //TGT Sell Placed
        //low <= priceTo Trade
        if (data[3] <= MB.priceToTrade) {
          MB.isFirstTrade = false;
          MB.status = 9;
          MB.executedTradeCount += 1;
          MB.comments.push(
            `TGT Sell Order EXEC ${MB.priceToTrade.toFixed(
              2
            )} TGT:${MB.target.toFixed(2)} SL:${MB.stopLoss.toFixed(
              2
            )}  at ${getTimeForComment(data)}`
          );
          // sell_order_executed
          MB.trades.push({
            side: 'SELL',
            exec: MB.priceToTrade,
            isLast: false,
          })
          // trades.push({
          //   side: 'SELL',
          //   exec: MB.priceToTrade,
          //   isLast: false,
          // });
    
          return res(true);
          //update bands and convert to normal order
          //new high >  old high
        }
        // low <= stoploss
        if (data[2] >= MB.stopLoss) {
          //place BUY Sell Order
          MB.isFirstTrade = false;
          MB.priceToTrade = data[2] + buySellDiff;
          MB.comments.push(
            `SL Reached cancel TGT Sell Order ${getTimeForComment(data)}`
          );
          cancelOpenOrder('SELL',MB.openOrderId,MB._id)
          //cancel_sell_order
          if (data[2] >= MB.high) {
            //Normal Order
            MB.high = data[2];
            MB.allHigh = data[2];
            MB.target = 0;
            MB.stopLoss = 0;
            MB.comments.push(
              `New High(${data[2]}) at ${getTimeForComment(data)}`
            );
            setUpperBandAndLowerBand(data,MB);
            MB.status = 2;
            MB.comments.push(
              `SL Reached Normall Buy order Placed at ${MB.priceToTrade.toFixed(
                2
              )} at ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()
            placeOrderToBroker('BUY',MB.priceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0])

            //place_buy_order
          } else {
            MB.status = 3;
            setTargetFunction('BUY',MB);
            MB.comments.push(
              `SL Reached TGT BUY order Placed at ${MB.priceToTrade.toFixed(
                2
              )} TGT${MB.target.toFixed(
                2
              )} sl:${MB.stopLoss.toFixed(
                2
              )} at ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()

            placeOrderToBroker('BUY',MB.priceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0])

            //place_buy_order
            //Target Order
          }
          //check new Low
        }
        break;
      }
      case 6: {
        // live Buy Normal
        // low <= LB
        if (data[3] <= MB.LB) {
          //Time to placed SL Order
          if (data[3] <= MB.low) {
            //SL Sell Normal order
            MB.status = 10;
            MB.slOrderPlaced = true;
            MB.slOrderStatus = 4;
            MB.slPriceToTrade = data[3] - buySellDiff;
            MB.comments.push(
              `LB reached SL SELL Normal Order placed at ${MB.slPriceToTrade.toFixed(
                2
              )} ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()

            placeOrderToBroker('SELL',MB.slPriceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0])

          } else {
            //SL Sell Target Order
            MB.status = 12;
            MB.slOrderPlaced = true;
            MB.slOrderStatus = 5;
            MB.slPriceToTrade = data[3] - buySellDiff;
            setTargetFunction('SELL',MB);
            MB.comments.push(
              `LB reached SL SELL TGT Order placed at ${MB.slPriceToTrade.toFixed(
                2
              )} Target:${MB.target.toFixed(
                2
              )} stoploss:${MB.stopLoss.toFixed(
                2
              )} ${getTimeForComment(data)}`
            );
          }
          MB.openOrderId = generateUniqId()
          placeOrderToBroker('SELL',MB.slPriceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0]);

          //Low <= new Low
          if (data[3] < MB.low) {
            //set NEW low and reverse UB LB
            MB.low = data[3];
            MB.allLow = data[3];
            setUpperBandAndLowerBand(data,MB);
          }
        }
    
        //High > New High
        if (data[2] > MB.high) {
          MB.allHigh = data[2];
          MB.high = data[2];
          //reverse UB LB
    
          setUpperBandAndLowerBand(data,MB);
        }
    
        break;
      }
      case 7: {
        // live Buy target
    
        // low <= stoploss
        if (data[3] <= MB.stopLoss) {
          //Place sell order same logic from live buy normal
          //Time to placed SL Order
          if (data[3] <= MB.low) {
            //SL Sell Normal order
            MB.status = 11;
            MB.slOrderPlaced = true;
            MB.slOrderStatus = 4;
            MB.slPriceToTrade = data[3] - buySellDiff;
            MB.comments.push(
              `Stoploss reached SL SELL Normal Order placed at ${MB.slPriceToTrade.toFixed(
                2
              )} ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()
            placeOrderToBroker('SELL',MB.slPriceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0]);
          } else {
            //SL Sell Target Order
            MB.status = 13;
            MB.slOrderPlaced = true;
            MB.slOrderStatus = 5;
            MB.slPriceToTrade = data[3] - buySellDiff;
            setTargetFunction('SELL',MB);
            MB.comments.push(
              `Stoploss reached SL SELL TGT Order placed at ${MB.slPriceToTrade.toFixed(
                2
              )} Target:${MB.target.toFixed(
                2
              )} stoploss:${MB.stopLoss.toFixed(
                2
              )} ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()
            placeOrderToBroker('SELL',MB.slPriceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0]);
          }
    
          //Low <= new Low
          if (data[3] < MB.low) {
            //set NEW low and reverse UB LB
            MB.low = data[3];
            MB.allLow = data[3];
            setUpperBandAndLowerBand(data,MB);
          }
        }
    
        //high >= target
        if (data[2] >= MB.target) {
          //high > new high
          if (data[2] >= MB.high) {
            //set new high
            MB.high = data[2];
            MB.allHigh = data[2];
          }
          //set UB and LB
          setUpperBandAndLowerBand(data,MB);
    
          //convert to normal Buy order
          MB.target = 0;
          MB.stopLoss = 0;
          MB.status = 6;
          MB.comments.push(
            `Target Reached Convert TGT BUY to Normal BUY at: ${MB.priceToTrade.toFixed(
              2
            )} ${getTimeForComment(data)}`
          );
        }
    
        break;
      }
      case 8: {
        // live Sell Normal
        // High >= UB
        if (data[2] >= MB.UB) {
          //Time to placed SL Order
          if (data[2] >= MB.high) {
            //SL Buy Normal order
            MB.status = 14;
            MB.slOrderPlaced = true;
            MB.slOrderStatus = 2;
            MB.slPriceToTrade = data[2] + buySellDiff;
            MB.comments.push(
              `UB reached SL Buy Normal Order placed at ${MB.slPriceToTrade.toFixed(
                2
              )} ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()

            placeOrderToBroker('BUY',MB.slPriceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0]);

          } else {
            //SL BUY Target Order
            MB.status = 16;
            MB.slOrderPlaced = true;
            MB.slOrderStatus = 3;
            MB.slPriceToTrade = data[2] + buySellDiff;
            setTargetFunction('BUY',MB);
            MB.comments.push(
              `UB reached SL BUY TGT Order placed at ${MB.slPriceToTrade.toFixed(
                2
              )} Target:${MB.target.toFixed(
                2
              )} stoploss:${MB.stopLoss.toFixed(
                2
              )} ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()
            placeOrderToBroker('BUY',MB.slPriceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0]);

          }
    
          //High >= new High
          if (data[3] < MB.low) {
            //set NEW High and reverse UB LB
            MB.high = data[2];
            MB.allHigh = data[2];
            setUpperBandAndLowerBand(data,MB);
          }
        }
    
        //low < new low
        if (data[3] < MB.low) {
          MB.low = data[3];
          MB.allLow = data[3];
          //reverse UB LB
    
          setUpperBandAndLowerBand(data,MB);
        }
    
        break;
      }
      case 9: {
        //live sell target order
        // high >= stoploss
        if (data[2] >= MB.stopLoss) {
          //Place buy order same logic from live sell normal
          //Time to placed SL Order
          if (data[2] >= MB.high) {
            //SL Buy Normal order
            MB.status = 15;
            MB.slOrderPlaced = true;
            MB.slOrderStatus = 2;
            MB.slPriceToTrade = data[2] + buySellDiff;
            MB.comments.push(
              `StopLoss reached SL Buy Normal Order placed at ${
                MB.slPriceToTrade
              } ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()
            placeOrderToBroker('BUY',MB.slPriceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0]);

          } else {
            //SL BUY Target Order
            MB.status = 17;
            MB.slOrderPlaced = true;
            MB.slOrderStatus = 3;
            MB.slPriceToTrade = data[2] + buySellDiff;
            setTargetFunction('BUY',MB);
            MB.comments.push(
              `StopLoss reached SL BUY TGT Order placed at ${
                MB.slPriceToTrade
              } Target:${MB.target} stoploss:${
                MB.stopLoss
              } ${getTimeForComment(data)}`
            );
            MB.openOrderId = generateUniqId()

            placeOrderToBroker('BUY',MB.slPriceToTrade.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0]);

          }
    
          //High >= new High
          if (data[3] < MB.low) {
            //set NEW High and reverse UB LB
            MB.high = data[2];
            MB.allHigh = data[2];
            setUpperBandAndLowerBand(data,MB);
          }
        }
    
        //Low <= target
        if (data[3] <= MB.target) {
          //Low < new Low
          if (data[3] < MB.low) {
            //set new low
            MB.low = data[3];
            MB.allLow = data[3];
          }
          //set UB and LB
          setUpperBandAndLowerBand(data,MB);
    
          //convert to normal sell order
          MB.target = 0;
          MB.stopLoss = 0;
          MB.status = 8;
          MB.comments.push(
            `Target Reached Convert TGT Sell to Normal Sell at: ${
              MB.priceToTrade
            } ${getTimeForComment(data)}`
          );
        }
    
        break;
      }
      case 10: {
        //Live Buy Normal Sl Sell Normal ///liveBuyNormalSlSellNormal
        //high > Old High
        if (data[2] > MB.high) {
          //Cancel Stop Loss Sell Order
          MB.status = 6;
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          MB.slPriceToTrade = 0;
          MB.stopLoss = 0;
          MB.comments.push(
            `New High cancel SL Normal Sell order at ${getTimeForComment(
              data
            )}`
          );
          cancelOpenOrder('SELL',MB.openOrderId,MB._id)
          //set New High
          MB.high = data[2];
          MB.allHigh = data[2];
          //set UB LB
          setUpperBandAndLowerBand(data,MB);
          return res(true);
        }
    
        //low < SL Trade Price
        if (data[3] <= MB.slPriceToTrade) {
          // Stop Normal Buy order
          //Switf sl normal sell to main order
          MB.status = 8;
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          MB.priceToTrade = MB.slPriceToTrade;
          MB.slPriceToTrade = 0;
          MB.executedTradeCount += 1;
          MB.comments.push(
            `Stoploss Normal Sell order EXEC at ${
              MB.priceToTrade
            } ${getTimeForComment(data)}`
          );
          MB.trades.push({
            side: 'SELL',
            exec: MB.priceToTrade,
            isLast: false,
          })
          // trades.push({
          //   side: 'SELL',
          //   exec: MB.priceToTrade,
          //   isLast: false,
          // });
          // low < old low
          if (data[3] < MB.low) {
            //set new Low
            MB.low = data[3];
            MB.allLow = data[3];
          }
          // Update UB LB   (Uniq)
          setUpperBandAndLowerBand(data,MB);
        }
    
        break;
      }
      case 11: {
        //Live Buy Target Sl Sell Normal //liveBuyTargetSlSellNormal
        //High > target //Positive
        if (data[2] >= MB.target) {
          //Cancel Sl Normal order
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          MB.slPriceToTrade = 0;
          MB.stopLoss = 0;
          //Change TGT buy to Normal Buy
          MB.status = 6;
          MB.comments.push(
            `Target Reached Cancel Normal Sell order and revise to Normal Buy Order at ${getTimeForComment(
              data
            )}`
          );
          //Set target to new High
          MB.high = MB.target;
          setUpperBandAndLowerBand(data,MB);
          //Update UB LB
          return res(true);
        }
    
        // low <= slTradePrice //Negative
        if (data[3] <= MB.slPriceToTrade) {
          //Change Normal sell to Main Sell Order
          MB.status = 8;
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          MB.priceToTrade = MB.slPriceToTrade;
          MB.slPriceToTrade = 0;
          MB.executedTradeCount += 1;
          MB.comments.push(
            `Stoploss Normal Sell order EXEC at ${
              MB.priceToTrade
            } ${getTimeForComment(data)}`
          );
          MB.trades.push({
            side: 'SELL',
            exec: MB.priceToTrade,
            isLast: false,
          })
          // trades.push({
          //   side: 'SELL',
          //   exec: MB.priceToTrade,
          //   isLast: false,
          // });
    
          // low < old low
          if (data[3] < MB.low) {
            //set new Low
            MB.low = data[3];
            MB.allLow = data[3];
          }
          // Update UB LB   (Uniq)
          setUpperBandAndLowerBand(data,MB);
        }
    
        break;
      }
      case 12: {
        //Live Buy Normal Sl Sell Target  // liveBuyNormalSlSellTarget
        //high > Old High
        if (data[2] > MB.high) {
          //Cancel Stop Loss Sell Order
          MB.status = 6;
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          MB.slPriceToTrade = 0;
          MB.stopLoss = 0;
          MB.comments.push(
            `New High cancel SL Target Sell order at ${getTimeForComment(
              data
            )}`
          );
          cancelOpenOrder('SELL',MB.openOrderId,MB._id)
          //set New High
          MB.high = data[2];
          MB.allHigh = data[2];
          //set UB LB
          setUpperBandAndLowerBand(data,MB);
          return res(true);
        }
    
        //low < SL Trade Price
        if (data[3] <= MB.slPriceToTrade) {
          // Stop Normal Buy order
          MB.status = 9;
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          //Switf sl Target sell to main order
          MB.priceToTrade = MB.slPriceToTrade;
          MB.slPriceToTrade = 0;
          MB.executedTradeCount += 1;
          MB.comments.push(
            `Stoploss Target Sell order EXEC at ${
              MB.priceToTrade
            } ${getTimeForComment(data)}`
          );
          MB.trades.push({
            side: 'SELL',
            exec: MB.priceToTrade,
            isLast: false,
          })
          // trades.push({
          //   side: 'SELL',
          //   exec: MB.priceToTrade,
          //   isLast: false,
          // });
    
          // low < old low
          if (data[3] < MB.low) {
            //set new Low
            MB.low = data[3];
            MB.allLow = data[3];
          }
        }
        break;
      }
      case 13: {
        //Live Buy Target Sl Sell Target //liveBuyTargetSlSellTarget
        //High > target //Positive
        if (data[2] >= MB.target) {
          //Cancel Sl Normal order
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          MB.slPriceToTrade = 0;
          MB.stopLoss = 0;
          //Change TGT buy to Normal Buy
          MB.status = 6;
          MB.comments.push(
            `Target Reached Cancel TGT Sell order and revise to Normal Buy Order at ${getTimeForComment(
              data
            )}`
          );
          cancelOpenOrder('SELL',MB.openOrderId,MB._id)
          //Set target to new High
          MB.high = MB.target;
          setUpperBandAndLowerBand(data,MB);
          //Update UB LB
          return res(true);
        }
    
        if (data[3] <= MB.slPriceToTrade) {
          // Stop Normal Buy order
          MB.status = 9;
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          //Switf sl Target sell to main order
          MB.priceToTrade = MB.slPriceToTrade;
          MB.slPriceToTrade = 0;
          MB.executedTradeCount += 1;
          MB.comments.push(
            `Stoploss Target Sell order EXEC at ${
              MB.priceToTrade
            } ${getTimeForComment(data)}`
          );
          MB.trades.push({
            side: 'SELL',
            exec: MB.priceToTrade,
            isLast: false,
          })
          // trades.push({
          //   side: 'SELL',
          //   exec: MB.priceToTrade,
          //   isLast: false,
          // });
    
          // low < old low
          if (data[3] < MB.low) {
            //set new Low
            MB.low = data[3];
            MB.allLow = data[3];
          }
        }
        break;
      }
      case 14: {
        //Live Normal Sell Sl Normal buy// liveSellNormalSlBuyNormal
    
        //Low < Old Low //positive
        if (data[3] < MB.low) {
          //Cancel Stop Loss normal buy Order
          MB.status = 8;
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          MB.slPriceToTrade = 0;
          MB.stopLoss = 0;
          MB.comments.push(
            `New Low cancel SL Normal Buy order at ${getTimeForComment(
              data
            )}`
          );
          cancelOpenOrder('BUY',MB.openOrderId,MB._id)
          //set New Low
          MB.low = data[3];
          MB.allLow = data[3];
          //set UB LB
          setUpperBandAndLowerBand(data,MB);
          return res(true);
        }
    
        //high >= SL Trade Price // negative
        if (data[2] >= MB.slPriceToTrade) {
          // Stop Normal Sell order
          //Switf sl normal sell to main order
          MB.status = 6;
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          MB.priceToTrade = MB.slPriceToTrade;
          MB.slPriceToTrade = 0;
          MB.executedTradeCount += 1;
          MB.comments.push(
            `Stoploss Normal Buy order EXEC at ${
              MB.priceToTrade
            } ${getTimeForComment(data)}`
          );
          MB.trades.push({
            side: 'BUY',
            exec: MB.priceToTrade,
            isLast: false,
          })
          // trades.push({
          //   side: 'BUY',
          //   exec: MB.priceToTrade,
          //   isLast: false,
          // });
    
          // high > old high
          if (data[2] > MB.high) {
            //set new high
            MB.high = data[2];
            MB.allHigh = data[2];
          }
          // Update UB LB   (Uniq)
          setUpperBandAndLowerBand(data,MB);
        }
    
        break;
      }
      case 15: {
        // Live Target Sell SL Normal Buy liveSellTargetSlBuyNormal
        //low < target //Positive
        if (data[3] <= MB.target) {
          //Cancel Normal buy
          //Change TGT SEll to normal Sell
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          MB.slPriceToTrade = 0;
          MB.stopLoss = 0;
          //Change TGT buy to Normal Buy
          MB.status = 8;
          MB.comments.push(
            `Target Reached Cancel Normal Buy order and revise to Normal Sell Order at ${getTimeForComment(
              data
            )}`
          );
          cancelOpenOrder('BUY',MB.openOrderId,MB._id)
          //Set target to new High
          MB.low = MB.target;
          setUpperBandAndLowerBand(data,MB);
          //Update UB LB
          return res(true);
        }
    
        // high >= slTradePrice //Negative
        if (data[2] >= MB.slPriceToTrade) {
          //Change Normal buy to Main buy Order
          MB.status = 6;
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          MB.priceToTrade = MB.slPriceToTrade;
          MB.slPriceToTrade = 0;
          MB.executedTradeCount += 1;
          MB.comments.push(
            `Stoploss Normal Buy order EXEC at ${
              MB.priceToTrade
            } ${getTimeForComment(data)}`
          );
          MB.trades.push({
            side: 'BUY',
            exec: MB.priceToTrade,
            isLast: false,
          })
          // trades.push({
          //   side: 'BUY',
          //   exec: MB.priceToTrade,
          //   isLast: false,
          // });
    
          // high > old high
          if (data[2] > MB.high) {
            //set new high
            MB.high = data[2];
            MB.allHigh = data[2];
          }
          // Update UB LB   (Uniq)
          setUpperBandAndLowerBand(data,MB);
        }
        break;
      }
      case 16: {
        //Live normal sell SL TGT BUY //liveSellNormalSlBuyTarget
        //Low < Old Low
        if (data[3] < MB.low) {
          //Cancel Stop Loss TGT Buy Order
          MB.status = 8;
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          MB.slPriceToTrade = 0;
          MB.stopLoss = 0;
          MB.comments.push(
            `New Low cancel SL Target Buy order at ${getTimeForComment(
              data
            )}`
          );
          cancelOpenOrder('BUY',MB.openOrderId,MB._id)
          //set New Low
          MB.low = data[3];
          MB.allLow = data[3];
          //set UB LB
          setUpperBandAndLowerBand(data,MB);
          return res(true);
        }
    
        //high >= SL Trade Price
        if (data[2] >= MB.slPriceToTrade) {
          // Stop Normal sell order
          MB.status = 7;
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          //Switf sl Target sell to main order
          MB.priceToTrade = MB.slPriceToTrade;
          MB.slPriceToTrade = 0;
          MB.executedTradeCount += 1;
          MB.comments.push(
            `Stoploss Target Buy order EXEC at ${
              MB.priceToTrade
            } ${getTimeForComment(data)}`
          );
          MB.trades.push({
            side: 'BUY',
            exec: MB.priceToTrade,
            isLast: false,
          });
    
          // high > old high
          if (data[2] > MB.high) {
            //set new high
            MB.high = data[2];
            MB.allHigh = data[2];
          }
        }
        break;
      }
      case 17: {
        //LiVe TGT Sell order SL tgt Buy//liveSellTargetSlBuyTarget
        //low <= target //Positive
        if (data[3] <= MB.target) {
          //Cancel tgt buy
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          MB.slPriceToTrade = 0;
          MB.stopLoss = 0;
          //Change TGT Sell to Normal Sell
          MB.status = 8;
          MB.comments.push(
            `Target Reached Cancel TGT buy order and revise to Normal sell Order at ${getTimeForComment(
              data
            )}`
          );
          cancelOpenOrder('BUY',MB.openOrderId,MB._id)
          //Set target to new low
          MB.low = MB.target;
          setUpperBandAndLowerBand(data,MB);
          //Update UB LB
          return res(true);
        }
    
        if (data[2] >= MB.slPriceToTrade) {
          // Stop TGT sell  order
          MB.status = 7;
          MB.slOrderPlaced = false;
          MB.slOrderStatus = 1;
          //Switf sl Target buy to main order
          MB.priceToTrade = MB.slPriceToTrade;
          MB.slPriceToTrade = 0;
          MB.executedTradeCount += 1;

          MB.comments.push(
            `Stoploss Target buy order EXEC at ${
              MB.priceToTrade
            } ${getTimeForComment(data)}`
          );
          MB.trades.push({
            side: 'BUY',
            exec: MB.priceToTrade,
            isLast: false,
          });
    
          // high > old high
          if (data[2] > MB.high) {
            //set new High
            MB.high = data[2];
            MB.allHigh = data[2];
          }
        }
        break;
      }
      }//Switch 
      res(true)

    } catch (error) {
      rej(error)
      console.log(error)
    }

  })

}

  //Check to place Order Case 1
let checkToPlaceOrder = (data,MB) => {
    //Initial order excution
    if (data[2] >= MB.high) {
      MB.high = data[2];
      MB.allHigh = data[2];
      setUpperBandAndLowerBand(data,MB);
    }
    if (data[2] >= MB.UB) {
      if (data[2] < MB.high) {
        setTargetFunction('BUY',MB);
        MB.comments.push(
          `Crossed UB Buy Order placed at ${
            data[2] + buySellDiff
          } Target at ${MB.target}, Stoploss:${
            MB.stopLoss
          } Time:${new Date(data[0]).getHours()}:${new Date(
            data[0]
          ).getMinutes()}`
        );
        MB.status = 3;
        MB.openOrderId = generateUniqId()

        placeOrderToBroker('BUY',customParseFloat((data[2] + buySellDiff),2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0])
        //place_buy_order
      } else {
        MB.status = 2;
        MB.comments.push(
          `Crossed UB Buy Order placed at ${
            data[2] + buySellDiff
          }, Time:${new Date(data[0]).getHours()}:${new Date(
            data[0]
          ).getMinutes()}`
        );
        MB.openOrderId = generateUniqId()

        placeOrderToBroker('BUY',customParseFloat((data[2] + buySellDiff),2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0])
        //place_buy_order
      }
      MB.priceToTrade = customParseFloat(
        data[2] + buySellDiff
      );
      return;
    }
    if (data[3] <= MB.low) {
      MB.low = data[3];
      MB.allLow = data[3];
      setUpperBandAndLowerBand(data,MB);
    }
    if (data[3] <= MB.LB) {
      if (data[3] > MB.low) {
        setTargetFunction('SELL',MB);
        MB.status = 5;
        MB.comments.push(
          `Crossed LB Sell Order placed at ${
            data[3] - buySellDiff
          } Target at ${MB.target}, Stoploss:${
            MB.stopLoss
          } ${getTimeForComment(data)}`
        );
        MB.openOrderId = generateUniqId()

        placeOrderToBroker('SELL',customParseFloat((data[3] - buySellDiff),2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0]);

        //place_sell_order
      } else {
        MB.status = 4;
        MB.comments.push(
          `Crossed LB Sell Order placed at ${
            data[3] - buySellDiff
          }, ${getTimeForComment(data)}`
        );
        MB.openOrderId = generateUniqId()

        placeOrderToBroker('SELL',customParseFloat((data[3] - buySellDiff),2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0])
        //place_sell_order
      }
      MB.priceToTrade = customParseFloat(
        data[3] - buySellDiff
      );
      // console.log(`Crossed LB SELL Order placed at ${data[3] - buySellDiff}`);
      return;
    }
  }

 let setTargetFunction = (type,MB) => {
    if (type == 'BUY') {
      let dif = MB.open - MB.allLow;
      MB.target = MB.open + dif;
      MB.stopLoss = MB.allLow;
    } else if (type == 'SELL') {
      let dif = MB.allHigh - MB.open;
      MB.target = MB.open - dif;
      MB.stopLoss = MB.allHigh;
    }
  }
  //Find upper and Lower Band
  let setUpperBandAndLowerBand = (data,MB)  => {
    let diff = data[2] - data[3];
    let UB = customParseFloat(data[2] + diff);
    let LB = customParseFloat(data[3] - diff);
    if (MB.isFirstTrade) {
      if (!MB.UB || MB.UB >= UB) MB.UB = UB;
      //18264 < 18275
      if (!MB.LB || LB >= MB.LB) MB.LB = LB;
    } else {
      MB.UB = UB;
      MB.LB = LB;
    }
  }


  //Convert num to decimal with single
let  customParseFloat = (value, cus = 2) => {
    return parseFloat(value.toFixed(cus));
}

let createNewMB = () =>{
  return new DailyMarketWatch({
      allHigh: 0,
      allLow: 0,
      high: 0,
      low: 0,
      open: 0,
      UB: 0,
      LB: 0,
      target: 0,
      stopLoss: 0,
      priceToTrade: 0,
      trades: [],
      status: 1,
      isFirstTrade: true,
      comments: [],
      slOrderStatus: 1,
      slOrderPlaced: false,
      slPriceToTrade: 0,
      tradeStarted: false,
      lastCandleTimeStamp: ''
    })
}

let closeTrade = async(data) => {
  return new Promise(async(res,rej) => {
    try {
      let day = new Date(data[0]);
      let isoDateString = day.toISOString().split('T')[0];       
    
      let MB = await DailyMarketWatch.findOne({date: isoDateString});
      //let data = await getCandles(isoDateString,token);
      let closePrice = data[1];
      //MB.openOrderId = generateUniqId()


      if (buySide.includes(MB.status))
       {
        if(MB.openOrderId != ''){
          //one buy order is in open state close it before placing exit order
          await cancelOpenOrder('SELL',MB.openOrderId,MB._id);
        }
        // buy side open
        MB.comments.push(
          `TimeEnd Sell EXEC at open price ${closePrice}`
        );
        MB.trades.push({ side: 'SELL', exec: closePrice, isLast: true });
        MB.openOrderId = generateUniqId()
        MB.executedTradeCount += 1;
        console.log('Time up cancel all pending order and execute exit order')
        placeOrderToBroker('SELL',closePrice.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0],true);

      } else if (sellSide.includes(MB.status)) {
        // Sell Side Open
        if(MB.openOrderId != ''){
          //one buy order is in open state close it before placing exit order
          await cancelOpenOrder('BUY',MB.openOrderId,MB._id);
        }
        MB.comments.push(`TimeEnd Buy EXEC at open price ${closePrice}`);
        MB.trades.push({ side: 'BUY', exec: closePrice, isLast: true });
        MB.executedTradeCount += 1;
        console.log('Time up cancel all pending order and execute exit order')
        MB.openOrderId = generateUniqId()
        placeOrderToBroker('BUY',closePrice.toFixed(2),MB.openOrderId,MB._id,MB.executedTradeCount,data[0],true);
      } else {
        MB.comments.push(
          `Cancell all the pending orders and close the trade`
        );
      }
      MB.status = 18;
      MB.target = 0;
      MB.stopLoss = 0;
      MB.priceToTrade = 0;
      MB.slOrderPlaced = false;
      MB.slPriceToTrade = 0;
      MB.slOrderStatus = 1;
      MB.status = 1;
      MB.tradeEnd = true;
      await calculatePoints(MB);
      await MB.save()
      return res(true);
    } catch (error) {
      console.log(error)
      rej(true)
    } 
  })

 

}

  //Calculate Points
let  calculatePoints = async(MB) => {
  return new Promise((res,rej) => {
    try {
      let points = { side: '', tradePrice: 0, pointsEarned: 0, isFirst: true };
      // this.datas.totalTrades += this.trades.length;
      MB.trades.forEach((trade) => {
        if (trade.side == 'BUY') {
          if (points.isFirst) {
            points.side = 'BUY';
            points.tradePrice = trade.exec;
            points.isFirst = false;
          } else {
            let p = points.tradePrice - trade.exec;
            points.pointsEarned += p;
            //Check is last trade
            if (trade.isLast) {
              return;
            } else {
              points.side = 'SELL';
              points.tradePrice = trade.exec;
            }
          }
        } else if (trade.side == 'SELL') {
          if (points.isFirst) {
            points.side = 'SELL';
            points.tradePrice = trade.exec;
            points.isFirst = false;
          } else {
            //buy               //Sell
            let p = trade.exec - points.tradePrice;
            points.pointsEarned += p;
            //Check is last trade
            if (trade.isLast) {
              return;
            } else {
              points.side = 'BUY';
              points.tradePrice = trade.exec;
            }
          }
        }
      });
      MB.totalPointsEarned = points.pointsEarned;
      res(true)
    } catch (error) {
      console.log(error);
      rej(error);
    }
   
    // this.datas.setResultEachDay({ date: this.MB.date, ProfitAndLoss: this.customParseFloat(this.totalPointsEarned), noOfTrades: this.trades.length })
    // alert(this.totalPointsEarned)
  })

  }

  //get time for comment method
let getTimeForComment = (data) => {
    return `Time: ${new Date(data[0]).getHours()}:${new Date(
      data[0]
    ).getMinutes()}`;
  }

let generateUniqId = () => {
  return parseInt((Math.random() * Date.now()).toFixed());
} 
//High =2, low  = 3

// enum Order {
//   nill = 1,
//   pendingBUYNomal = 2, //initial trade
//   pendingBUYTarget = 3, //initial trade

//   pendingSellNormal = 4, //initial trade
//   pendingSellTarget = 5, //initial trade

//   liveBuyNormal = 6, //initial trade with no SL trade
//   liveBuyTarget = 7, //initial trade with no SL trade

//   liveSellNormal = 8, //initial trade with no SL trade
//   liveSellTarget = 9, //initial trade with no SL trade

//   liveBuyNormalSlSellNormal = 10, // buy N = S N,BUY T = S N,B N = S T, B T = S T
//   liveBuyTargetSlSellNormal = 11,
//   liveBuyNormalSlSellTarget = 12,
//   liveBuyTargetSlSellTarget = 13,

//   liveSellNormalSlBuyNormal = 14, // S N = B N,S T = B N,S N = B T, S T = B T
//   liveSellTargetSlBuyNormal = 15,
//   liveSellNormalSlBuyTarget = 16,
//   liveSellTargetSlBuyTarget = 17,
//   completed = 12,
// }

//[timestamp = 0, open = 1, high = 2, low = 3, close= 4, volume].