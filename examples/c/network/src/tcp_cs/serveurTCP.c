#include "serveurTCP.h"

int startServer(void) {
    int serverSocket;
    struct sockaddr_in serv_addr;
    /*
    * Ouvrir socket (socket STREAM)
    */
    if ((serverSocket = socket(PF_INET, SOCK_STREAM, 0))<0) {
        perror("erreur socket");
        return 1;
    }

    memset(&serv_addr, 0, sizeof(serv_addr) );
    serv_addr.sin_family = AF_INET ;

    serv_addr.sin_addr.s_addr = htonl(INADDR_ANY);
    serv_addr.sin_port = htons(SERV_PORT);
    if (bind(serverSocket,(struct sockaddr *)&serv_addr, sizeof(serv_addr) ) <0) {
        perror ("servecho: erreur bind\n");
        return 1;
    }

    if (listen(serverSocket, SOMAXCONN) <0) {
        perror ("servecho: erreur listen\n");
        return 1;
    }

    int dialogSocket;
    int clilen;
    struct sockaddr_in cli_addr;
    clilen = sizeof(cli_addr);
    dialogSocket = accept(serverSocket, (struct sockaddr *)&cli_addr, (socklen_t *)&clilen);
    if (dialogSocket < 0) {
        perror("servecho : erreur accep\n");
        close(serverSocket);
        return 1;
    }
    while (1) {
        char buffer[280];
        int n;
        n = read(dialogSocket, buffer, 280);
        if (n < 0) {
            perror("servecho : erreur read\n");
            close(dialogSocket);
            return 1;
        }
        printf("servecho : message reçu : %s\n", buffer);
        n = write(dialogSocket, buffer, strlen(buffer));
        if (n < 0) {
            perror("servecho : erreur write\n");
            close(dialogSocket);
            return 1;
        }
    }
    close(dialogSocket);
    return 0;
}
