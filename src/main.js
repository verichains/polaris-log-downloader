const path = require('path');
const LogIndex = require('./LogIndex');
const Downloader = require('./Downloader');
const logger = require('./Logger');
const {sleep} = require('./utils');

// Load Environment
require('dotenv').config({path: path.resolve(__dirname, '.env')});

async function download_logs() {
    let log_index = new LogIndex(process.env.BASE_URL, process.env.APP_ID, process.env.API_KEY);
    let downloader = new Downloader(process.env.BASE_URL, process.env.APP_ID, process.env.API_KEY, process.env.STORAGE_FULL_PATH);
    while (true) {
        try {
            // If there is no file to download then sleep 30s
            let all_downloaded = await log_index.wasDownloadAllLogs();

            if (all_downloaded) {
                logger.info("We downloaded all logs file, wait 30s to get next logs file.......");
                await sleep(30);
                await log_index.downloadAndParseIndexFile();
                continue;
            }

            // Get Next Log Info
            let next_log_info = await log_index.getNextLogInfo();
            let retry = 3;
            let is_success;
            while (true) {
                is_success = await downloader.downloadAndVerify(next_log_info.filename, next_log_info.url, next_log_info.md5);

                if (is_success) {
                    break;
                }
                retry--;
                logger.info("Sleep 30s before retry ......");
                await sleep(30);
            }

            if (is_success) {
                logger.info(`Download file successfully ${next_log_info.url} ${next_log_info.start_time} ${next_log_info.end_time}`);
                await log_index.saveLatestIndexLog(next_log_info.filename);
                continue;
            }

            logger.info(`Cannot download file ${next_log_info.url}, sleep 30s and refresh index, download next file`);
        } catch (e) {
            logger.error("Error! Sleep 30s and retry...... ", e);
            await sleep(30);
        }

    }
}

download_logs();
