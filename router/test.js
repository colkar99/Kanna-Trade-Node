const express = require("express");
//const validateToken = require("../helper/validate_token");

const router = express.Router();
const testController = require("../controllers/test");

router.get("/", testController.test);
router.post("/getCandles", testController.getCandles);
router.post("/instrument/id", testController.getDataByIntrumentId);


//router.post("/signin", userController.signin);
//router.get("/getAllOrders", validateToken, userController.getAllOrders);
//router.post("/isRead", validateToken, userController.isRead);
//router.post("/removeItem", validateToken, userController.isRead);

//
module.exports = router;