import { PencilService } from './PencilService';
import { ChatService } from './ChatService';
import { BookmarkService } from './BookmarkService';

const defaultServices = {    
    pencilService: new PencilService(),
    chatService: new ChatService(),
    bookmarkService: new BookmarkService(),
};
export const services = () => defaultServices;
