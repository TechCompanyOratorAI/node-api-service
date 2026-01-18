require("dotenv").config();

import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import viewEngine from "./config/viewEngine";
import initWebRoutes from "./route/web";
import connectDB from "./config/conectDB";
import cors from "cors";

let app = express();

// CORS configuration
app.use(
  cors({
    origin: "*",
  })
);

// Middleware
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

viewEngine(app);
initWebRoutes(app);

connectDB();

let port = process.env.PORT || 8080; //Port === undefined => Port = 6060

app.listen(port, () => {
  //callback
  console.log("Backend Nodejs is running on the port: " + port);
});
