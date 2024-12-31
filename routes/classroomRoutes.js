const express = require('express');
const Classroom = require('../models/classroomModel');
const User = require('../models/userModel')
const Post = require('../models/postModel');
const ClassroomJoin = require('../models/classroomJoinModel'); 
const responseFunction = require('../utils/responseFunction');
const authTokenHandler = require('../middlewares/checkAuthToken');
const router = express.Router();
const nodemailer = require('nodemailer');

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

router.post('/create', authTokenHandler, async (req, responseFunction, next) => {
    const {name, description} = req.body;
    const owner = req.userId;

    console.log(name)
    console.log(description)

    if(!name){
        return responseFunction(res, 400, "Classroom name is required", null, false);
    }

    try{
        const classroom = await classroomModel.create({
            name: name,
            description: description,
            owner: owner
        });        
        await classroom.save();
        return responseFunction(res, 201, "Classroom created successfully", classroom, true);
    }
    catch(err){
        return responseFunction(res, 500, "Internal Server error", err, false);
    }
});

router.get('/classroomscreatedbyme', authTokenHandler, async (req, res) => {
    try {
        const classrooms = await Classroom.find({ owner: req.userId });

        return responseFunction(res, 200, 'Classrooms fetched successfully', classrooms, true);
    } catch (err) {
        return responseFunction(res, 500, 'Internal server error', err, false);
    }
})

router.get('/getclassbyid/:classid', authTokenHandler, async (req, res) => {
    const { classid } = req.params;


    try {
         

        const classroom = await Classroom.findById(classid).populate('posts');
        if (!classroom) {
            return responseFunction(res, 404, 'Classroom not found', null, false);
        }

        return responseFunction(res, 200, 'Classroom fetched successfully', classroom, true);
    }
    catch (err) {
        return responseFunction(res, 500, 'Internal server error', err, false);
    }
})

router.post('/addpost', authTokenHandler, async (req, res) => {
    const { title, description, classId } = req.body;
    try {
        const classroom = await Classroom.findById(classId);
        if (!classroom) {
            return res.status(404).json({ message: 'Classroom not found' });
        }


        const newPost = new Post({
            title,
            description,
            classId,
            createdBy: req.userId,  // req.user comes from requireAuth middleware
        });
        await newPost.save();

        
        classroom.posts.push(newPost._id);
        await classroom.save();


        res.status(201).json({ message: 'Post created successfully', post: newPost });


    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }

})


module.exports = router