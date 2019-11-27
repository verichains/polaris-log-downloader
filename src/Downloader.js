const axios = require('axios');
const logger = require('./Logger');
const fs = require('fs');
const http = require('http');
const path = require('path');
const md5_file = require('md5-file');

class Downloader {
    constructor(base_url, app_id, api_key, storage_path) {
        this.base_url = base_url;
        this.app_id = app_id;
        this.api_key = api_key;
        this.storage_path = storage_path;
    }

    async downloadAndVerify(file_name, url, hash) {
        let download_url = url + `?api_key=${this.api_key}`;

        if (!fs.existsSync(this.storage_path)) {
            fs.mkdirSync(this.storage_path);
        }

        let file_des = path.join(this.storage_path, file_name);

        let file = fs.createWriteStream(file_des);
        let result = await new Promise((resolve) => {
            http.get(download_url, function (response) {
                response.pipe(file);
                file.on('finish', function () {
                    file.close();  // close() is async, call cb after close completes.
                    resolve(true);
                });
            }).on('error', function (err) { // Handle errors
                fs.unlinkSync(file_des); // Delete the file async. (But we don't check the result)
                resolve(false);
            });
        });

        if (!result) {
            return false;
        }

        let md5 = await new Promise(resolve => {
            md5_file(file_des, (error, h) => {
                resolve(h);
            })
        });

        if (md5 === hash) {
            logger.info(`Download file ${file_name} ${md5} successfully`);
            return true;
        }
        logger.info(`Download file ${file_name} wrong md5 | expected:${hash} real:${md5}`);
        return false;
    }

    async downloadJsonFile(url) {
        let download_url = url + `?api_key=${this.api_key}`;

        try {
            let data = (await axios({
                url: download_url,
                method: 'GET',
                responseType: 'string'
            })).data;

            return data;
        } catch (e) {
            logger.error(`Error when download or parse json file ${url}`, e);
        }

        return null;
    }
}

module.exports = Downloader;
