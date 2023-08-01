var KiteConnect = require("kiteconnect").KiteConnect;
const User = require('../model/user');

var kc = new KiteConnect({
  api_key: process.env.API_KEY,
});


exports.setToken = async(req,res,next) => {
    try {
        console.log(req.body.data.request_token)
        let token = req.body.data.request_token;
        if(!token) return res.status(404).send("Oh uh, Token Not available");

        let user = await User.findOne({email: process.env.ADMIN_MAIL});
        if(!user) return res.status(404).send("User not available");

        user.token = token;
        if(user.session_token == ""){
            let generateKtSession = await kc.generateSession(user.token,process.env.SECERET_KEY);
            user.session_token = generateKtSession.access_token; 
        }
        let margin = await kc.getMargins();
        console.log(margin);
        await user.save()

        res.send({message: "Token Successfully saved"})
        
    } catch (error) {
        console.log(error)

    }
}