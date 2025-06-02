#include "clientTCP.h"

int startClient(int argc, char *argv[]) {
    int serverSocket;
    /*
    * Ouvrir socket (socket STREAM)
    */
    if ((serverSocket = socket(PF_INET, SOCK_STREAM, 0)) <0) {
        perror ("erreur socket");
        exit (1);
    }

    struct sockaddr_in serv_addr;
    /*
    * Lier l'adresse locale à la socket
    */;
    memset(&serv_addr, 0, sizeof(serv_addr) );
    serv_addr.sin_family = AF_INET ;
    serv_addr.sin_addr.s_addr = htonl(INADDR_ANY);
    serv_addr.sin_port = htons(CLIENT_PORT);
    if (bind(serverSocket,(struct sockaddr *)&serv_addr, sizeof(serv_addr) ) <0) {
        perror ("servecho: erreur bind\n");
        exit (1);
    }

    /*
    * Remplir la structure serv_addr avec
    l'adresse du serveur
    */
    bzero( (char *) &serv_addr, sizeof(serv_addr) );
    serv_addr.sin_family = AF_INET;

    if (argc != 3) {
        fprintf(stderr, "usage : %s <adresse IP> <port>\n", argv[0]);
        exit(1);
    }
    serv_addr.sin_port = htons((uint16_t) atoi(argv[2]));
    serv_addr.sin_addr.s_addr = inet_addr(argv[1]);
    if (connect(serverSocket, (struct sockaddr *) &serv_addr, sizeof(serv_addr) ) < 0){
        perror ("cliecho : erreur connect");
        return 1;
    }
    char buffer[280];
    int n;
    while (1) {
        printf("cliecho : message à envoyer : ");
        memset(buffer, 0, sizeof(buffer));
        scanf("%s", buffer);
        n = write(serverSocket, buffer, strlen(buffer));
        if (n < 0) {
            perror("cliecho : erreur write\n");
            close(serverSocket);
            return 1;
        }
        memset(buffer, 0, sizeof(buffer));
        n = read(serverSocket, buffer, 280);
        if (n < 0) {
            perror("cliecho : erreur read\n");
            close(serverSocket);
            return 1;
        }
        printf("cliecho : message reçu : %s\n", buffer);
    }
}
