import {ImageService} from './ImageService';
import {AmazonService} from './AmazonService';
import {ConfigService} from './ConfigService';
import {PencilService} from './PencilService';

const defaultServices = {
    imageService: new ImageService(),
    amazonService: new AmazonService(),
    pencilService: new PencilService(),
    config: new ConfigService()
};
export const services = () => defaultServices;