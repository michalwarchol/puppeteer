import { VercelRequest, VercelResponse } from "@vercel/node";
import aws from "aws-sdk";

type ImageType = {
    ETag?: string,
    Key?: string,
    LastModified?: Date,
    Owner?: AWS.S3.Owner,
    Size?: number,
    StorageClass?: string
}

module.exports = async (req: VercelRequest, res: VercelResponse) => {
    const signedUrlExpireSeconds = 60 * 10;
    const s3 = new aws.S3({
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_SECRET,
        signatureVersion: "v4",
        region: process.env.AWS_REGION
    });

    try {

        s3.listObjects({
            Bucket: process.env.AWS_BUCKET_NAME
        }, (err, data) => {
            if (err) {
                res.statusCode = 500;
                res.json({
                    body: "Sorry, Something went wrong!",
                });
            }

            let urls: string[] = [];
            data.Contents.map((elem: ImageType) => {
                const url: string = s3.getSignedUrl("getObject", {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: elem.Key,
                    Expires: signedUrlExpireSeconds
                })
                if (!url) {
                    res.statusCode = 500;
                    res.json({
                        body: "Sorry, Something went wrong!",
                    });
                }
                urls.push(url);
            })
            res.status(200).json(urls);


        })
    } catch (e) {
        res.statusCode = 500;
        res.json({
            body: "Sorry, Something went wrong!",
        });
    }
}