/** @format */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
let bodyParser = require("body-parser");
const dns = require("dns");
const { fail } = require("assert");
const fs = require("fs");
const { hostname } = require("os");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));
//load index.html
app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

//save url on post
app
  .use(bodyParser.urlencoded({ extended: true }))
  .route("/api/shorturl")
  .post((req, res, next) => {
    //load existing urls/data
    const currData = getExistingUrls();
    //get the url from input
    let { url } = req.body;
    let hostName;
    let shortUrlId;
    //empty string or invalid url error
    const errMsg = { error: "invalid url" };

    if (!url || !url.match(/\.{1,}/)) return res.json(errMsg);

    //check if url already exists,
    if (currData !== []) {
      const foundUrl = currData.find((obj) => obj.original_url === url);
      if (foundUrl) return res.json(foundUrl);
    }

    //strip https:// from url
    if (url.match(/\//)) {
      const urlSplit = url.split("//");
      hostName = urlSplit[urlSplit.length - 1];
    }

    //if host name is not defined
    if (!hostName) hostName = url;

    //handle .ex/jhjh/jhjh
    if (hostName.match(/\//)) {
      const splitHostName = hostName.split("/");
      hostName = splitHostName.shift();
    }

    dns.lookup(hostName, (err, address, family) => {
      if (err) {
        console.log(err);
        return res.json(errMsg);
      }
      //increase if not update short url id
      shortUrlId =
        currData.length !== 0 ? currData[currData.length - 1].short_url + 1 : 0;
      const successData = { original_url: url, short_url: shortUrlId };
      currData.push(successData);
      saveShortUrl(currData);

      res.send(successData);
      next();
    });
  });

//get and redirect
app.get("/api/shorturl/:shortCode", (req, res) => {
  const urlsList = getExistingUrls();
  const { shortCode } = req.params;
  const errMsg = { error: "No short URL found for the given input" };

  const found = urlsList.find((url) => url.short_url === +shortCode);
  if (!found) return res.json(errMsg);

  res.redirect(found.original_url);
});

const saveShortUrl = (urlData) => {
  fs.writeFileSync("urlsData.json", JSON.stringify(urlData));
};

const getExistingUrls = () => {
  const urlData = fs.readFileSync("urlsData.json");
  return JSON.parse(urlData);
};

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
