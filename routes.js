const express= require("express");
const Router = express.Router();
const multer = require("multer");
const path = require("path");

const storage=multer.diskStorage(
  {
    destination:(req,file,cb)=>{
      cb(null,  "./uploads" );
    },
    filename:(req,file,cb)=>{
      cb(null,Date.now()+file.originalname);
    }
  }
)

const upload = multer(
  {
    storage:storage
  }
);

Router.route("/add-image").post(upload.single("img"),(req,res)=>{
  try {
    return res.json({path:req.file.filename});
  } catch (e) {
    return res.json({error:e});
  }
});

module.exports = Router;