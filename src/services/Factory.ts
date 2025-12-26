import { PencilService } from './PencilService';
import { ChatService } from './ChatService';

const defaultServices = {    
    pencilService: new PencilService(),
    chatService: new ChatService(),
};
export const services = () => defaultServices;
