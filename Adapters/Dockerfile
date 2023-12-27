ARG ADAPTER

# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
ARG ADAPTER
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
COPY packages/Types/package.json /temp/dev/packages/Types/
COPY packages/${ADAPTER}/package.json /temp/dev/packages/${ADAPTER}/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
COPY packages/Types/package.json /temp/prod/packages/Types/
COPY packages/${ADAPTER}/package.json /temp/prod/packages/${ADAPTER}/
RUN cd /temp/prod/packages/${ADAPTER} && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS release
ARG ADAPTER
COPY --from=install /temp/dev/node_modules node_modules
COPY bun.lockb .
COPY package.json .
COPY tsconfig.json .
COPY packages/Types packages/Types
COPY packages/${ADAPTER} packages/${ADAPTER}

WORKDIR /usr/src/app/packages/${ADAPTER}

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "." ]
