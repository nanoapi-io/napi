#ifndef TNMAP_H
#define TNMAP_H
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <unistd.h>
#define MAX_PORTS 65535
#endif

int tnmap(const char* ip_addr);
void scanVertical(const char* ip_addr);
