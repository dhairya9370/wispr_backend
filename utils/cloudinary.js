const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const path = require("path");

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const isImage = file.mimetype.startsWith("image/");
        const isVideo = file.mimetype.startsWith("video/");
        const isRaw = !isImage && !isVideo;

        return {
            folder: "wispr_dev",
            resource_type: "auto",
            format: undefined, // Cloudinary auto-detects
            public_id: `${Date.now()}-${path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
            type: "upload"
        };
    },
});

const upload = multer({ storage });

const deleteFromCloudinary = async (url) => {
    if (!url) return { result: "no url provided" };
    try {
        const parts = url.split("/");
        const uploadIndex = parts.indexOf("upload");
        if (uploadIndex === -1) {
            console.warn("⚠️ URL is not a standard Cloudinary upload URL:", url);
            return { result: "invalid url" };
        }

        const publicIdParts = parts.slice(uploadIndex + 1).filter(p => !/^v\d+$/.test(p));
        const filename = publicIdParts.pop();
        const baseFilename = filename.split(".")[0];
        const publicId = [...publicIdParts, baseFilename].join("/");

        const resourceTypes = ["image", "video", "raw"];
        for (const type of resourceTypes) {
            try {
                const result = await cloudinary.uploader.destroy(publicId, { resource_type: type, timeout: 60000 });
                if (result.result === "ok") {
                    console.log("✅ Deleted:", publicId, "as", type);
                    return result;
                }
            } catch (err) {
                if (err.http_code === 404 || err.message?.includes("not found")) {
                    continue;
                }
                throw err;
            }
        }

        console.log("⚠️ File not found in any resource type:", publicId);
        return { result: "not found" };
    } catch (err) {
        console.error("❌ Cloudinary deletion failed:", err);
        throw err;
    }
};

module.exports = {
    cloudinary,
    storage,
    upload,
    deleteFromCloudinary
};
