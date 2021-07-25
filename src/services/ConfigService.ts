import logger from "../util/logger";
import * as fs from "fs";
import YAML from "yaml";

interface Config {
    s3Bucket: string;
    awsAccessKeyId: string;
    awsAccessKeySecret: string;
}

let config: Config;

function loadConfig(): Config {
    const isProd = () => process.env.NODE_ENV === "production";
    const path = isProd() ? "/data/app-configs/prod/goapi2/config.yml" : "/data/app-configs/dev/goapi2/config.yml";
    const configYml = fs.readFileSync(path, "utf8") as string;
    const config = YAML.parse(configYml) as Config;
    logger.info(`Loaded config file ${path} NODE_ENV=${process.env.NODE_ENV}`);

    // populate aws credential to process.env, normally we don't use system variable for the sake of simplicity
    if (!process.env.AWS_ACCESS_KEY_ID) {
        process.env.AWS_ACCESS_KEY_ID = config.awsAccessKeyId;
        process.env.AWS_SECRET_ACCESS_KEY = config.awsAccessKeySecret;
    }
    return config;
}

loadConfig();

export class ConfigService {
    get() {
        if (!config) {
            config = loadConfig();
        }
        return config;
    }
}