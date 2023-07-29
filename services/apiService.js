const axios = require("axios");



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