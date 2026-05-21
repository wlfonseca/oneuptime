FROM ghcr.io/nicoulaj/freeswitch:latest

RUN mkdir -p /etc/freeswitch

COPY freeswitch.xml /etc/freeswitch/freeswitch.xml
COPY vars.xml /etc/freeswitch/vars.xml
COPY dialplan.xml /etc/freeswitch/dialplan/default.xml
COPY sip_profiles /etc/freeswitch/sip_profiles

CMD ["freeswitch", "-nonat", "-nf", "-c"]
