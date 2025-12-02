# Use the same Node.js version as your production Dockerfile
FROM node:22.3.0-bullseye

# Install sudo and create dev user with sudo privileges
RUN apt-get update && apt-get install -y sudo && \
    groupadd -r dev && useradd -r -g dev -m -s /bin/bash dev && \
    echo "dev ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/dev && \
    chmod 0440 /etc/sudoers.d/dev && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install global packages
RUN npm install -g typescript ts-node

# Set working directory
WORKDIR /workspace

# The devcontainer will mount the workspace, so we don't need to copy files here
# Dependencies will be installed via postCreateCommand in devcontainer.json

