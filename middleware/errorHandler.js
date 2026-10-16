module.exports = (err, re, res, next)=>{
    const status = err. statusCode || 500
    res.status(status).json({success:false, message:err.message || "Server error"})
}