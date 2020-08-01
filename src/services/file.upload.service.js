const logger = require('../common/logger')(__filename);
const cloudinary = require('cloudinary').v2;
const config = require('config');

const cloud_name = config.get('cloudinaryCloudName');
const api_key = config.get('cloudinaryApiKey');
const api_secret = config.get('cloudinaryApiSecret');

cloudinary.config({
    cloud_name,
    api_key,
    api_secret
});

module.exports.uploadImage = async (userId, image) => {
    // Log the function name and the data
    logger.info(`uploadImage - userId: ${userId}, image.length: ${image.length}`);

    try {
        return await cloudinary.uploader.upload(image, { public_id: `blogger/${userId}`, width: 350, crop: "scale" });
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return null;
    }
}

module.exports.deleteImage = async (public_id) => {
    // Log the function name and the data
    logger.info(`deleteImage - public_id: ${public_id}`);

    try {
        await cloudinary.uploader.destroy(public_id);
        return true;
    } catch (e) {
        // Catch error and log it
        logger.error(e.message);
        // Send to client that server error occured
        return false;
    }
}