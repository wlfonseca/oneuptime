FROM alpine:3.21

RUN apk add --no-cache \
    bash \
    postgresql16-client \
    curl \
    aws-cli \
    jq \
    findutils \
    coreutils \
    dcron

RUN mkdir -p /backups

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
