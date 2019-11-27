const Downloader = require('./Downloader');
const logger = require('./Logger');
const {sleep} = require('./utils');
const path = require('path');
const fs = require('fs');
const CACHE_FILE_PATH = path.resolve(__dirname, '../cache/latest_index');

class LogIndex {
    constructor(base_url, app_id, api_key) {
        this.base_url = base_url;
        this.app_id = app_id;
        this.api_key = api_key;
        this.downloader = new Downloader(base_url, app_id, api_key, null);
        this.index_info = null;
    }

    async wasDownloadAllLogs() {
        if (!this.index_info) {
            let result = await this.downloadAndParseIndexFile();

            if (!result) {
                return true;
            }
        }

        let index = await this.getLatestIndexLog();
        if (!index) {
            return false;
        }

        if (this.index_info.files.length === 0) {
            return true;
        }

        return index === this.index_info.files[this.index_info.files.length - 1].filename;
    }

    async getNextLogInfo() {
        if (!this.index_info) {
            let result = await this.downloadAndParseIndexFile();
            if (!result) {
                return null;
            }
        }

        let latest_index = await this.getLatestIndexLog();
        let item;

        if (!latest_index) {
            item = this.index_info.files[0];
        } else {
            let pos = this.index_info.files.findIndex(el => {
                return el.filename === latest_index;
            });

            if (pos === (this.index_info.files.length - 1)) {
                return null;
            }

            item = this.index_info.files[pos + 1];
        }

        item.url = this.base_url + `/${this.index_info.type}/${item.filename}`;

        return item;
    }

    async getLatestIndexLog() {
        if (!fs.existsSync(CACHE_FILE_PATH)) {
            return null;
        }

        let latest_index = fs.readFileSync(CACHE_FILE_PATH, 'utf8');

        if (!latest_index) {
            return null;
        }

        return latest_index;
    }

    async saveLatestIndexLog(index) {
        fs.writeFileSync(CACHE_FILE_PATH, index);
    }

    async downloadAndParseIndexFile() {
        let index_url = this.base_url + '/access-log_index.json';

        let retry = 3;

        while (true) {
            this.index_info = await this.downloader.downloadJsonFile(index_url);

            if (this.index_info) {
                return true;
            }

            retry -= 1;

            if (retry === 0) {
                logger.info('Fail to download index file........');
                break;
            }

            logger.info('Cannot download index file,  wait 30s to retry........');
            await sleep(30);
        }

        return false;
    }
}

module.exports = LogIndex;
