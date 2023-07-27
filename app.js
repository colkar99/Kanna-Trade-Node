require("dotenv").config();
const express = require("express");
const app = express();
const port = 3000;
var cors = require("cors");
var bodyParser = require("body-parser");
var mongoose = require('mongoose')

// var bankniftyData = require("./datas/banknifty");
// var niftyData = require("./datas/nifty");
var userRouter = require('./router/user');
var testRouter = require('./router/test');



app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());


mongoose.connect(process.env.MONGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((res) => console.log("db connected successfully"))
  .catch((err) => console.log(err));
//////

app.use("/api/v1/user", userRouter);
app.use("/api/v1/test", testRouter);



app.listen(process.env.PORT || 3000, () => {
  //mailer.pingMailServer();
  // mailer.sendMail("Hello World");
  console.log(`Server running at :${3000}`);
  console.log(`Doctor Backend running environment is ${process.env.NODE_ENV}`);
});


