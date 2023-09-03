const mongoose = require("mongoose");

const TradeSchema = mongoose.Schema(
  {
    variety: {type: String,
        enum: ["regular", "amo"],
        default: "regular"},
    order_type: {type: String, enum:["MARKET","LIMIT","SL","SL-M"],default:"SL-M"},
    product: {type: String, enum:["CNC","NRML","MIS"],default: "MIS"},
    validity: {type: String,enum:["DAY"],default: "DAY"},
    // For Stocks select NSE for F&O SElect NFO
    exchange:{type: String,enum:["NSE","BSE","NFO"],default: "NFO"},
    tradingsymbol:{type: String,default: ""},
    transaction_type:{type: String,enum:["BUY","SELL"],required: true},
    quantity: {type: Number,required: true},
    trigger_price: {type: Number,required: true},
    order_id:{type: Number,required: true},
    status: {type: String,enum:['ORDER_PLACED',"CANCELLED","COMPLETE"],required: true},
    order_date:{type: String,required: true},
    order_exe_price: {type: Number,required: true,default: 0},
    openOrderRefId:{type:String},
    market_data_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DailyMarketWatch'
    },
    isMarkedAsCompleted: {type: Boolean,default: false}
    //
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trade", TradeSchema); // Table Name, Schema Name


// PUT ORDER REQ RECEIVED	Order request has been received by the backend
// VALIDATION PENDING	Order pending validation by the RMS (Risk Management System)
// OPEN PENDING	Order is pending registration at the exchange
// MODIFY VALIDATION PENDING	Order's modification values are pending validation by the RMS
// MODIFY PENDING	Order's modification values are pending registration at the exchange
// TRIGGER PENDING	Order's placed but the fill is pending based on a trigger price.
// CANCEL PENDING	Order's cancellation request is pending registration at the exchange
// AMO REQ RECEIVED	Same as PUT ORDER REQ RECEIVED, but for AMOs