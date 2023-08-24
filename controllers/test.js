const axios = require("axios");
var bankniftyData = require("../datas/banknifty.json");
const User = require('../model/user');
 

exports.test = async(req,res,next) => {
    try {
        res.send({ message: "Hello world am working" });
      } catch (err) {
        console.log("Error Happend", err);
        res.status(500).send("Someting happend");
      }
}

exports.getCandles = async(req,res,next) => {
    try {
        const date = req.body.date;
        const token = req.body.token;
        const isOwnData = req.body.isOwnData;
        const user = await User.findOne({email:process.env.ADMIN_MAIL});
        // const intrumentId = 232961;

       const intrumentId = user.instrumentId;
    
        if (!isOwnData) {
          if (!token) return res.status(400).send("Token is missing");
          const url = `https://kite.zerodha.com/oms/instruments/historical/${intrumentId}/5minute?user_id=WB5864&oi=1&from=${date}&to=${date}`;
          const config = {
            headers: {
              authorization: token,
            },
          };
          const response = await axios.get(url, config);
          res.send(response.data);
        } else {
          // console.log(bankniftyData.data.candles);
          let tempData = {
            status: "success",
            data: {
              candles: [],
            },
          };
          bankniftyData.data.candles.forEach((element, index) => {
            let tempDate = element[0].split("T")[0];
            if (tempDate == date) {
              tempData.data.candles.push(element);
            }
          });
          res.send(tempData);
        }
      } catch (err) {
        console.log("Error Happend", err);
        res.status(500).send("Someting happend");
      }
}

exports.getDataByIntrumentId = async (req,res,next) =>{
    try {
        console.log(req.body);
        const fromDate = req.body.data.fromDate;
        const toDate = req.body.data.toDate;
        const token = req.body.data.token;
        const instrumentId = req.body.data.instrumentId;
    
        if (!token) return res.status(400).send("Token is missing");
        const url = `https://kite.zerodha.com/oms/instruments/historical/${instrumentId}/5minute?user_id=WB5864&oi=1&from=${fromDate}&to=${toDate}`;
        const config = {
          headers: {
            authorization: token,
          },
        };
        const response = await axios.get(url, config);
        res.send(response.data);
      } catch (err) {
        console.log("Error Happend", err);
        res.status(500).send("Someting happend");
      }
}