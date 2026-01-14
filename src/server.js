import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import viewEngine from "./config/viewEngine";
import initWebRoutes from "./route/web";
import connectDB from './config/conectDB';
import cors from 'cors';

require('dotenv').config();

let app = express();

// CORS configuration
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true // Allow cookies to be sent
}));

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

viewEngine(app);
initWebRoutes(app);

connectDB();

let port = process.env.PORT || 8080;  //Port === undefined => Port = 6060

app.listen(port, () => {
    //callback
    console.log("Backend Nodejs is running on the port: " + port);
})