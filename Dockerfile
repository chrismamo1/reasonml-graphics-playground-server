FROM debian:latest
RUN apt update
RUN apt -y install m4 opam mccs
RUN opam init -y --disable-sandboxing --solver=mccs
RUN opam update
RUN opam switch create 4.07.1
RUN opam install -y reason
# Install Node and NPM
# RUN sudo apt install -y git-core curl build-essential openssl libssl-dev python3 python
# RUN sudo mkdir /home/node && sudo chmod 777 /home/node
# RUN cd /home && git clone https://github.com/joyent/node.git
# RUN cd /home/node && git checkout v0.12 && pwd && ls && ./configure && make && sudo make install
# RUN curl -L https://npmjs.org/install.sh | sudo sh
# replace shell with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# update the repository sources list
# and install dependencies
RUN apt-get update \
    && apt-get install -y curl \
    && apt-get -y autoclean

# nvm environment variables
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 8.10.0

# install nvm
# https://github.com/creationix/nvm#install-script
RUN curl --silent -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash

# install node and npm
RUN source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

# add node and npm to path so the commands are available
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# confirm installation
RUN node -v
RUN npm -v

# Install BS platform
RUN npm install -g --unsafe-perm bs-platform rollup
RUN cd /home && bsb -init test && rm test/src/*
RUN bsb -v
ADD test/bsconfig.json /home/test/bsconfig.json
#CMD cd /home/test && bsb && cat src/*.bs.js
CMD NINJA_ANSI_FORCED=0 cd /home/test && \
  bsb 1>&2 && \
  rollup --format iife -o bundle.js --output.name blep -i src/main.bs.js --silent && \
  cat bundle.js