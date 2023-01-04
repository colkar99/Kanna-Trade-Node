const axios = require('axios');
const express = require('express')
const app = express()
const port = 3000
var cors = require('cors')
var bodyParser = require('body-parser')






// axios.get(url, config)
//   .then(response => {
//     console.log(response.data);
//   })
//   .catch(error => {
//     console.log(error);
//   });
app.use(cors())
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

//////
app.get('/', async(req, res) => {
    try{
        res.send("Hello world am working")
    }catch(err){
        console.log("Error Happend",err);
        res.status(500).send("Someting happend")
    }
  })

  app.post('/getCandles', async(req, res) => {
    try{
        const date = req.body.date;
        const token = req.body.token;
        if(!token) return res.status(400).send('Token is missing')
        const url = `https://kite.zerodha.com/oms/instruments/historical/8972290/5minute?user_id=WB5864&oi=1&from=${date}&to=${date}`
        const config = {
            headers:{
                authorization: token,
              
            }
          };
        const response = await axios.get(url, config)
        res.send(response.data)

    }catch(err){
        console.log("Error Happend",err);
        res.status(500).send("Someting happend")
    }
  })
  
  app.listen(port, () => {
    console.log(`App listening on port ${port}`)
  })
