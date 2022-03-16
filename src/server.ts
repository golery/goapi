import errorHandler from 'errorhandler';
import app from './app';
import {initDb} from './services/Init';

console.log('Starting...');

/**
 * Error Handler. Provides full stack
 */
if (process.env.NODE_ENV === 'development') {
    app.use(errorHandler());
}
 

const init = async() => {
    await initDb();
};

init().then(() => {
    /**
     * Start Express server.
     */
    const server = app.listen(app.get('port'), () => {
        console.log(
            '  App is running at http://localhost:%d in %s mode',
            app.get('port'),
            app.get('env')
        );
        console.log('  Press CTRL-C to stop\n');
    });
});
