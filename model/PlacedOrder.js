const mongoose = require("mongoose");

const PlacedOrderSchema = mongoose.Schema(
  {
    instrumentId: {type: String,required: true},
    tradingSymbol: {type: String,required: true},
    triggerPrice: {type: Number,required: true},
    side: {type: String,required: true},
    orderStatus: {type: String, enum:["NOT-TRIGGERED",'PLACED',"EXECUTED","CANCELLED"],default:"NOT-TRIGGERED"},
    // openOrderID: {type: String,required: true},
    date:{type: String,required: true},
    market_data_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DailyMarketWatch'
    },
    isFirstTrade: {type: Number},
    orderId:{type: String}
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlacedOrder", PlacedOrderSchema); // Table Name, Schema Name