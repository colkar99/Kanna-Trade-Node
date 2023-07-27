

exports.loginUser = async(req,res,next) => {
    try {
     res.send({Message: "From user controller"})  
    } catch (error) {
        console.log(error)
    }
}