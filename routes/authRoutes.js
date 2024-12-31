const express = require('express');
const verificationModel = require('../models/verificationModel');
const responseFunction = require('../utils/responseFunction').default;
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authTokenHandler = require('../middlewares/checkAuthToken');
const userModel = require('../models/userModel');

const mailer = async (receieveremail, code) => {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        post: 587,
        secure: false,
        requiredTLS: true,
        auth: {
            user: process.env.COMPANY_EMAIL,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    })

    let info = await transporter.sendMail({
        from: "Team MentorConnect",
        to: receieveremail,
        subject: "OTP for MentorConnect",
        text: "Your OTP is " + code,
        html: "<b>Your OTP is " + code + "</b>",
    })

    console.log("Message sent: %s", info.messageId);

    if(info.messageId) {
        return true;
    }
    return false;
}

router.get('/', (req, res) => {
    res.json({
        message: 'Auth route Home'
    })
})

router.post('/sendotp', async (req, res, next) => {
    const {email} = req.body;

    if(!email){
        return responseFunction(res, 400, "Email is required", null, false); 
    }

    try{
        await verificationModel.deleteMany({email: email});
        const code = Math.floor(100000 + Math.random() * 900000);
        const isSent = await mailer(email, code);

        const newVerification = await verificationModel.create({
            email: email,
            code: code
        })

        await newVerification.save();

        if(!isSent){
            return responseFunction(res, 500, "Internal Server error", null, false);
        }

        return responseFunction(res, 200, "OTP sent successfully", null, true);
    }
    catch(err){
        return responseFunction(res, 500, "Internal server error", err, 500);
    }
})

router.post('/register', async(req, res) => {
    const {name, email, password, otp, role} = req.body;
    
    if(!name || !email || !password || !otp || !role){
        return responseFunction(res, 400, "All fields are required", null, false);
    }

    if(password.length < 6){
        return responseFunction(res, 400, "Password should be atleast 6 charactres long", null, false);
    }
    try{
        let user = await userModel.findOne({email: email});
        const verificationQueue = await verificationModel.findOne({email: email});

        if(user){
            return responseFunction(res, 400, "User already exists", null, false);
        }

        if(!verificationQueue){
            return responseFunction(res, 400, "Please send OTP first", null, false);
        }
        const isMatch = await bcrypt.compare(otp, verificationQueue.code);

        if(!isMatch){
            return responseFunction(res, 400, "Invalid OTP", null, false);
        }

        user = await userModel.create({
            name: name,
            email: email,
            password: password,
            role: role
        });

        await user.save();
        await verificationModel.deleteOne({email: email});

        const authToken = jwt.sign({userId: user._id}, process.env.JWT_SECRET_KEY, {expiresIn: '1d'});
        const refreshToken = jwt.sign({userId: user._id}, process.env.JWT_REFRESH_SECERET_KEY, {expiresIn: '10d'});

        res.cookie('authToken', authToken, {httpOnly: true, secure: true, sameSite: 'none'});
        res.cookie('refreshToken', refreshToken, {httpOnly: true, secure: true, sameSite: 'none'});

        user.password = undefined;
        return responseFunction(res, 201, "Registered successfully", {user, authToken, refreshToken}, true);
    }
    catch(err){
        console.log(err);
        return responseFunction(res, 500, "Internal Server Error", err, false);
    }
})

router.post('/login', async (req, res, next) => {
    try{
        const {email, password} = req.body;
        const user = await userModel.findOne({email: email});
        
        if(!user){
            return responseFunction(res, 400, "Invalid Credentials", null, false);
        }
        const isMatch = await bcrypt.compare(password, user.password);
        
        if(!isMatch) {
            return responseFunction(res, 400, "Invalid Credentials", null, false);
        }

        const authToken = jwt.sign({userId: user._id}, process.env.JWT_SECRET_KEY, {expiresIn: '1d'});
        const refreshToken = jwt.sign({userId: user._id}, process.env.JWT_REFRESH_SECERET_KEY, {expiresIn: '10d'});

        res.cookie('authToken', authToken, {httpOnly: true, secure: true, sameSite: 'none'});
        res.cookie('refreshToken', refreshToken, {httpOnly: true, secure: true, sameSite: 'none'});
        
        user.password = "";
        return responseFunction(res, 200, "Logged in successfully", {user, authToken, refreshToken}, true);
    }
    catch(err){
        return responseFunction(res, 500, "Internal Server error", err, false);
    }
})

router.get('/checklogin', authTokenHandler, async (req, res, next) => {
    res.json({
        ok: req.ok,
        message: req.message,
        userId: req.userId
    })
});

router.get('/getuser', authTokenHandler, async (req, res, next) => {
    try {
        const user = await userModel.findById(req.userId).select('-password');
        if(!user) {
            return responseFunction(res, 400, "User not found", null, false);
        }
        return responseFunction(res, 200, "User found", user, true);
    }
    catch(err){
        return responseFunction(res, 500, "Internal server error", err, false);
    }
});

router.get('/logout', authTokenHandler, async (req, res, next) => {
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');
    localStorage.removeItem("user");
    res.json({
        ok: true,
        message: 'Logged out successfully'
    })
})

module.exports = router