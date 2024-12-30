const express = require('express');
const classroomModel = require('../models/classroomModel');
const responseFunction = require('../utils/responseFunction');
const authTokenHandler = require('../middlewares/checkAuthToken');
const router = express.Router();

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

module.exports = router