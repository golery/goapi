import {ImageService} from "./ImageService";
import {AmazonService} from "./AmazonService";
import {ConfigService} from "./ConfigService";

const defaultServices = {
    imageService: new ImageService(),
    amazonService: new AmazonService(),
    config: new ConfigService()
}
export const services = () => defaultServices;