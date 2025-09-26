const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require("path");

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // detect if it's image/video/pdf/doc etc.
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    const isRaw = !isImage && !isVideo;

    return {
      folder: "wispr_dev",
      resource_type: "auto",
      format: undefined, // let cloudinary auto-detect
      public_id: `${Date.now()}-${path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, "_")}`, 
      // public_id: `${Date.now()}-${path.parse(file.originalname).name}`,
      type: "upload"
    };
  },
});
module.exports= {cloudinary, storage}
