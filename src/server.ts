import errorHandler from 'errorhandler';
import app from './app';
import {initDb} from './services/Init';

console.log('Starting...v1');

/**
 * Error Handler. Provides full stack
 */
if (process.env.NODE_ENV === 'development') {
    app.use(errorHandler());
}

const init = async() => {
    console.log('Env: ' + process.env.NODE_ENV);
    await initDb();
};

init().then(() => {
     app.listen(app.get('port'), () => {
        console.log(
            '  App is running at http://localhost:%d in %s mode',
            app.get('port'),
            app.get('env')
        );
        console.log('  Press CTRL-C to stop\n');
    });
    
});
