var WebSocket = require('ws');
var moment = require('moment'); // require

const {sendMail} = require('../services/mailerService');
const User = require('../model/user');
const PlacedOrder = require('../model/PlacedOrder');
var {webSocketCheckOrderExecutedOrNot, placeOrder} = require('../services/kiteService');
var {placeMarketOrderToBroker} = require('../services/apiService');


var ws = null;
const NseCD = 3,
		BseCD = 6,
		Indices = 9,
		modeFull = "full", // Full quote including market depth. 164 bytes.
		modeQuote = "quote", // Quote excluding market depth. 52 bytes.
		modeLTP = "ltp"


function parseBinary(binpacks) {
  const packets = splitPackets(binpacks),
    ticks= [];

  for (let n = 0; n < packets.length; n++) {
    const bin = packets[n],
      instrument_token = buf2long(bin.slice(0, 4)),
      segment = instrument_token & 0xff;

    let tradable = true;
    if (segment === Indices) tradable = false;

    // Add price divisor based on segment
    let divisor = 100.0;
    if (segment === NseCD) {
      divisor = 10000000.0;

    } else if (segment == BseCD) {
      divisor = 10000.0;
    }

    // Parse LTP
    if (bin.byteLength === 8) {
      ticks.push({
        tradable: tradable,
        mode: modeLTP,
        instrument_token: instrument_token,
        last_price: buf2long(bin.slice(4, 8)) / divisor
      });
      // Parse indices quote and full mode
    } else if (bin.byteLength === 28 || bin.byteLength === 32) {
      let mode = modeQuote;
      if (bin.byteLength === 32) mode = modeFull;

      const tick = {
        tradable: tradable,
        mode: mode,
        instrument_token: instrument_token,
        last_price: buf2long(bin.slice(4, 8)) / divisor,
        ohlc: {
          high: buf2long(bin.slice(8, 12)) / divisor,
          low: buf2long(bin.slice(12, 16)) / divisor,
          open: buf2long(bin.slice(16, 20)) / divisor,
          close: buf2long(bin.slice(20, 24)) / divisor
        },
        change: buf2long(bin.slice(24, 28))
      };

      // Compute the change price using close price and last price
      if (tick.ohlc.close != 0) {
        tick.change = (tick.last_price - tick.ohlc.close) * 100 / tick.ohlc.close;
      }

      // Full mode with timestamp in seconds
      if (bin.byteLength === 32) {
        tick.exchange_timestamp = null;
        const timestamp = buf2long(bin.slice(28, 32));
        if (timestamp) tick.exchange_timestamp = new Date(timestamp * 1000);
      }

      ticks.push(tick);
    } else if (bin.byteLength === 44 || bin.byteLength === 184) {
      let mode = modeQuote;
      if (bin.byteLength === 184) mode = modeFull;

      const tick = {
        tradable: tradable,
        mode: mode,
        instrument_token: instrument_token,
        last_price: buf2long(bin.slice(4, 8)) / divisor,
        last_traded_quantity: buf2long(bin.slice(8, 12)),
        average_traded_price: buf2long(bin.slice(12, 16)) / divisor,
        volume_traded: buf2long(bin.slice(16, 20)),
        total_buy_quantity: buf2long(bin.slice(20, 24)),
        total_sell_quantity: buf2long(bin.slice(24, 28)),
        ohlc: {
          open: buf2long(bin.slice(28, 32)) / divisor,
          high: buf2long(bin.slice(32, 36)) / divisor,
          low: buf2long(bin.slice(36, 40)) / divisor,
          close: buf2long(bin.slice(40, 44)) / divisor
        }
      } 

      // Compute the change price using close price and last price
      if (tick.ohlc.close != 0) {
        tick.change = (tick.last_price - tick.ohlc.close) * 100 / tick.ohlc.close;
      }

      // Parse full mode
      if (bin.byteLength === 184) {
        // Parse last trade time
        tick.last_trade_time = null;
        const last_trade_time = buf2long(bin.slice(44, 48));
        if (last_trade_time) tick.last_trade_time = new Date(last_trade_time * 1000);

        // Parse timestamp
        tick.exchange_timestamp = null;
        const timestamp = buf2long(bin.slice(60, 64));
        if (timestamp) tick.exchange_timestamp = new Date(timestamp * 1000);

        // Parse OI
        tick.oi = buf2long(bin.slice(48, 52));
        tick.oi_day_high = buf2long(bin.slice(52, 56));
        tick.oi_day_low = buf2long(bin.slice(56, 60));
        tick.depth = {
          buy: [],
          sell: []
        };

        let s = 0, depth = bin.slice(64, 184);
        for (let i = 0; i < 10; i++) {
          s = i * 12;
          tick.depth[i < 5 ? "buy" : "sell"].push({
            quantity: buf2long(depth.slice(s, s + 4)),
            price: buf2long(depth.slice(s + 4, s + 8)) / divisor,
            orders: buf2long(depth.slice(s + 8, s + 10))
          });
        }
      }

      ticks.push(tick);
    }
  }

  return ticks;
}
	// split one long binary message into individual tick packets
function splitPackets(bin) {
    // number of packets
    let num = buf2long(bin.slice(0, 2)),
        j = 2,
        packets = [];

    for (let i = 0; i < num; i++) {
        // first two bytes is the packet length
        const size = buf2long(bin.slice(j, j + 2)),
            packet = bin.slice(j + 2, j + 2 + size);

        packets.push(packet);

        j += 2 + size;
    }

    return packets;
	}

// Big endian byte array to long.
function buf2long(buf) {
    let b = new Uint8Array(buf),
        val = 0,
        len = b.length;

    for (let i = 0, j = len - 1; i < len; i++, j--) {
        val += b[j] << (i * 8);
    }

    return val;
}

exports.startTicker = async(req,res,next) => {
    try{
        const user = await User.findOne({email:process.env.ADMIN_MAIL});
        
        const token = encodeURIComponent(user.token.split(' ')[1]);
        ws = new WebSocket(`wss://ws.zerodha.com/?api_key=kitefront&enctoken=${token}&user-agent=kite3-web&version=3.0.0`);
        let message = { a: "mode", v: ["ltp", [parseInt(user.instrumentId)]] };
        // let message = { a: "mode", v: ["ltp", [256265] ]};
    
        ws.on('open', function open() {
            ws.send(JSON.stringify(message));
          });
    
        ws.on('message', async function message(data)  {
          let response = parseBinary(data);
          if(!response.length) return;

          let placedOrder = await PlacedOrder.findOne({date: moment().format('YYYY-MM-DD').toString(),orderStatus: 'NOT-TRIGGERED'});
        
          
          if(placedOrder){
          if(placedOrder.side == 'BUY'){
             if(response[0].last_price >= placedOrder.triggerPrice){
                // Execute market order
                 let orderId = await placeMarketOrderToBroker('BUY',0,placedOrder._id,placedOrder.market_data_id,placedOrder.isFirstTrade);
                 placedOrder.orderId = orderId;
                 placedOrder.orderStatus = 'PLACED';
                 await placedOrder.save()
                // // Check Order Executed or not
                 await webSocketCheckOrderExecutedOrNot();
                 await stopTicker()
            }
          }else if(placedOrder.side == 'SELL'){
             if(response[0].last_price <= placedOrder.triggerPrice){
                // Execute market order
                 let orderId = await placeMarketOrderToBroker('SELL',0,placedOrder._id,placedOrder.market_data_id,placedOrder.isFirstTrade);
                 placedOrder.orderId = orderId;
                 placedOrder.orderStatus = 'PLACED';
                 await placedOrder.save()
                // // Check Order Executed or not
                 await webSocketCheckOrderExecutedOrNot();
                 await stopTicker()
            }
          }
        }
          console.log(response);
          });
          
        ws.on('error', console.error);
    
        if(res) res.send("Ticker Started Successfully")
        else return true
    }
    catch(err){
        console.log(err);
        sendMail("controller/StartTicker",{},err)
    }
   
}   

exports.stopTicker = async(req,res,next) => {
    try {
        if(ws == null || ws.readyState == 3) {
            if(res) res.send('No Sockets are running currently. Please try again');
            else return true
        }else{
            ws.close()
            if(res) res.send("Ticker Stopped successfully")
            else return true
        }
    } catch (error) {
        console.log(error);
        sendMail("controller/StopTicker",{},err)

    }
  

      
}  
