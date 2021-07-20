import { VercelRequest, VercelResponse } from "@vercel/node";
import aws from "aws-sdk";

module.exports = async (req: VercelRequest, res: VercelResponse) => {
    const img = req.query.img;
    const signedUrlExpireSeconds = 60 * 10;
    const s3 = new aws.S3({
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_SECRET,
        signatureVersion: "v4",
        region: process.env.AWS_REGION
    });

    try {
        const url = s3.getSignedUrl("getObject", {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: img,
            Expires: signedUrlExpireSeconds
        })
        if (!url) {
            res.statusCode = 500;
            res.json({
                body: "Sorry, Something went wrong!",
            });
        }
        res.status(200).json(url);
    } catch (e) {
        res.statusCode = 500;
        res.json({
            body: "Sorry, Something went wrong!",
        });
    }


}