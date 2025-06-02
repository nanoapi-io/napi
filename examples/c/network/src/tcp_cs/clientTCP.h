#ifndef CLIENTTCP_H

#include <sys/types.h>
#include <sys/socket.h>
#include <stdio.h>
#include <netinet/in.h>
#include <string.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdint.h>
#include <stdlib.h>

#define CLIENT_PORT 7776

int startClient(int argc, char *argv[]);

#define CLIENTTCP_H
#endif
