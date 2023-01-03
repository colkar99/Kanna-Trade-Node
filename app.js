const axios = require('axios');
const express = require('express')
const app = express()
const port = 3000
var cors = require('cors')





// axios.get(url, config)
//   .then(response => {
//     console.log(response.data);
//   })
//   .catch(error => {
//     console.log(error);
//   });
app.use(cors())
//////
app.get('/', async(req, res) => {
    try{
        const date = req.query.date;
        const token = req.query.token;
        if(!token) return res.status(400).send('Token is missing')
        const url = `https://kite.zerodha.com/oms/instruments/historical/8972290/5minute?user_id=WB5864&oi=1&from=${date}&to=${date}`
        const config = {
            headers:{
                authorization: 'enctoken dderKfuUlexIcFrXiMGcFxkuV6x81mJJDPb8/t18HJaf5xqttYHvJtsJjiwicqgAfEZ0hggaJe8bbDvkZH6m6UQ/FU+NFfsf7AFCHZ/3yBES2CeaLrTMzw==',
              
            }
          };
        const response = await axios.get(url, config)
        res.send(response.data)

    }catch(err){
        console.log("Error Happend");
        res.status(500).send("Someting happend")
    }
  })
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
