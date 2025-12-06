# Use the same Node.js version as your production Dockerfile
FROM node:22.3.0-bullseye

# Install sudo and create dev user with sudo privileges
RUN apt-get update && apt-get install -y sudo curl nano && \    
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Koyeb CLI
RUN curl -fsSL https://raw.githubusercontent.com/koyeb/koyeb-cli/master/install.sh | sh && \
    mv /root/.koyeb/bin/koyeb /usr/local/bin/koyeb && \
    chmod +x /usr/local/bin/koyeb && \
    rm -rf /root/.koyeb

# Install global packages
RUN npm install -g typescript ts-node

# Set working directory
WORKDIR /workspace

# The devcontainer will mount the workspace, so we don't need to copy files here
# Dependencies will be installed via postCreateCommand in devcontainer.json

