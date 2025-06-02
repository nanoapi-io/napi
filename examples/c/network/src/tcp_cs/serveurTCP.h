#ifndef SERVEURTCP_H

#include <sys/types.h>
#include <sys/socket.h>
#include <stdio.h>
#include <netinet/in.h>
#include <string.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdint.h>
#include <stdlib.h>

#define SERV_PORT 7777

int startServer(void);

#define SERVEURTCP_H
#endif
