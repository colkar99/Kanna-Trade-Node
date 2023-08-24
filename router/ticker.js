const express = require("express");
//const validateToken = require("../helper/validate_token");

const router = express.Router();
const TickerController = require("../controllers/ticker");

router.get("/startTicker", TickerController.startTicker);
router.get("/stopTicker", TickerController.stopTicker);




//router.post("/signin", userController.signin);
//router.get("/getAllOrders", validateToken, userController.getAllOrders);
//router.post("/isRead", validateToken, userController.isRead);
//router.post("/removeItem", validateToken, userController.isRead);

//
module.exports = router;