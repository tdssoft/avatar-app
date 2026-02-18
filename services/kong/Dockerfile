FROM kong:2.8.1-alpine

USER root
RUN apk add --no-cache gettext

COPY kong.yml.template /home/kong/kong.yml.template
COPY render-kong-config.sh /usr/local/bin/render-kong-config.sh

RUN chmod +x /usr/local/bin/render-kong-config.sh
USER kong

# Render config at container start so secrets stay in env vars (not in git).
ENTRYPOINT ["/usr/local/bin/render-kong-config.sh"]
CMD ["kong", "docker-start"]
