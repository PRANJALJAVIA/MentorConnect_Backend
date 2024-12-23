const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const dotenv = require('dotenv');
dotenv.config();

const port = process.env.PORT;
require('./db')

const alloweOrigins = [process.env.FRONTEND_URL]; //we can add more origin for frontend as needed

app.use(
    cors({
        origin: function (origin, callback) {
            if(!origin || alloweOrigins.includes(origin)){
                callback(null, true);
            }
            else{
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true
    })
)

app.use(bodyParser.json());
app.use(cookieParser({
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 7,
    signed: true
}));

const authRoutes = require('./routes/authRoutes');
// const calssroomRoutes = require('./routes/classroomRoutes');

// routes
app.use('/auth', authRoutes)
// app.use('/class', calssroomRoutes)

app.get('/', (req, res)=>{
    res.send('JP');
})

app.listen(port, ()=>{
    console.log(`MentoreConnect app listing on ${port}`)
})