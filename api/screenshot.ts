import puppeteer from "puppeteer-core";
import chrome from "chrome-aws-lambda";
import aws, { S3 } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { VercelRequest, VercelResponse } from "@vercel/node";

/** The code below determines the executable location for Chrome to
 * start up and take the screenshot when running a local development environment.
 *
 * If the code is running on Windows, find chrome.exe in the default location.
 * If the code is running on Linux, find the Chrome installation in the default location.
 * If the code is running on MacOS, find the Chrome installation in the default location.
 * You may need to update this code when running it locally depending on the location of
 * your Chrome installation on your operating system.
 */

const exePath =
  process.platform === "win32"
    ? "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    : process.platform === "linux"
      ? "/usr/bin/google-chrome"
      : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function getOptions(isDev: boolean) {
  let options;
  if (isDev) {
    options = {
      args: [],
      executablePath: exePath,
      headless: true,
    };
  } else {
    options = {
      args: chrome.args,
      executablePath: await chrome.executablePath,
      headless: chrome.headless,
    };
  }
  return options;
}
module.exports = async (req: VercelRequest, res: VercelResponse) => {
  const pageToScreenshot = req.query.page;

  // pass in this parameter if you are developing locally
  // to ensure puppeteer picks up your machine installation of
  // Chrome via the configurable options
  const isDev = req.query.isDev === "true";

  try {
    //check for https for safety!
    if (!pageToScreenshot.includes("https://")) {
     res.statusCode = 404;
     res.json({
       body: "Sorry, we couldn't screenshot that page. Did you include https://?",
     });
    }

    // get options for browser
    const options = await getOptions(isDev);

    // launch a new headless browser with dev / prod options
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();

    // set the viewport size
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    // tell the page to visit the url
    await page.goto(pageToScreenshot as string);

    // take a screenshot
    const file = await page.screenshot({
      type: "png",
    });
    // close the browser
    await browser.close();

    const s3 = new aws.S3({
      accessKeyId: process.env.AWS_ID,
      secretAccessKey: process.env.AWS_SECRET,
    });

    const params: S3.Types.PutObjectRequest = {
      Bucket: process.env.AWS_BUCKET_NAME as string,
      Key: uuidv4() as string,
      Body: file as string
    }

    s3.upload(params, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.json({
          body: "Sorry, Something went wrong!",
        });
      }
      // return the file!
      res.statusCode = 200;
      res.setHeader("Content-Type", `image/png`);
      console.log(file);
      res.end(file);
    })
  } catch (e) {
    res.statusCode = 500;
    res.json({
      body: "Sorry, Something went wrong!",
    });
  }
};

export { }