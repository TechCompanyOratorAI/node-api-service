import express from "express";
import apiRoutes from "../routes/index.js";

let router = express.Router();

let initWebRoutes = (app) => {
  // Mount API routes
  app.use("/api/v1", apiRoutes);

  // Web routes (if any)
  return app.use("/", router);
};

module.exports = initWebRoutes;
