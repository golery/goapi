echo "Setting up goapi/scripts/zshrc.sh"


export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion


export JAVA_HOME=~/apps/jdk
export ANDROID_HOME=~/apps/android_sdk 
PATH_KOYEB=$HOME/.koyeb/bin
export PATH=$PATH_KOYEB:/home/hly/apps/flutter/bin:~/apps/jdk/bin:~/apps/android_sdk/platform-tools:$PATH
