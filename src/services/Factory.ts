import { PencilService } from './PencilService';

const defaultServices = {    
    pencilService: new PencilService(),
};
export const services = () => defaultServices;
