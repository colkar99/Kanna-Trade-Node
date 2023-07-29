const mongoose = require("mongoose");

const DailyMarketWatchSchema = mongoose.Schema(
  {
    allHigh: {type: Number,required: true,default: 0 },
    allLow:  {type: Number,required: true,default: 0 },
    high:  {type: Number,required: true,default: 0 },
    low:  {type: Number,required: true,default: 0 },
    open:  {type: Number,required: true,default: 0 },
    UB:  {type: Number,required: true,default: 0 },
    LB:  {type: Number,required: true,default: 0 },
    target:  {type: Number,required: true,default: 0 },
    stopLoss:  {type: Number,required: true,default: 0 },
    priceToTrade:  {type: Number,required: true,default: 0 },
    trades: [],
    status: {type: Number,required: true,default: 1 },
    isFirstTrade: {type: Boolean,required: true,default: true },
    comments: [],
    slOrderStatus: {type: Number,required: true,default: 1 },
    slOrderPlaced: {type: Boolean,required: true,default: false },
    slPriceToTrade: {type: Number,required: true,default: 0 },
    date: {type: String,required: true},
    tradeStarted : {type: Boolean,required: true, default: false},
    lastCandleTimeStamp: {type: String, required: true},
    totalPointsEarned: {type: Number,required: true,default: 0},
    tradeEnd: {type: Boolean,required: true,default: false}
  },
  { timestamps: true }
);

module.exports = mongoose.model("DailyMarketWatch", DailyMarketWatchSchema); // Table Name, Schema Name