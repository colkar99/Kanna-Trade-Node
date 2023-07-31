const mongoose = require("mongoose");

const UserSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    phoneCode: { type: String },
    password: { type: String, required: true },
    apiKey: { type: String },
    apiSecret: { type: String },
    subscriptionStatus: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    isDelete: { type: Boolean, default: false },
    slPercent: { type: Number, default: 1 },
    slLimitPercent: { type: Number, default: 0.2 },
    subscribeTimeFrame: { type: Number, default: 2 },
    token: { type: String },
    isAdmin:{type: Boolean, required: true, default: false},
    brokerUserId:{type: String,required: true, default: ''},
    tradingQuantity:{type: Number,required: true,default: 15},
    tradingSymbol: {type: String,required: ''}
    //
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema); // Table Name, Schema Name