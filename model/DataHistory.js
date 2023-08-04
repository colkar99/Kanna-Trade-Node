const mongoose = require("mongoose");

const DataHistorySchema = mongoose.Schema(
  {
    instrumentId: {type: String,required: true},
    tradingSymbol: {type: String,required: true},
    data: {type:String,required: true}
  },
  { timestamps: true }
);

module.exports = mongoose.model("DataHistory", DataHistorySchema); // Table Name, Schema Name