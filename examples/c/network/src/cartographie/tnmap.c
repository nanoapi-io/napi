#include "tnmap.h"

// Vérifie si un hôte est actif
// Retourne un socket si l'hôte est actif, 1 sinon
int tnmap(const char* ip_addr) {
    int sock;
    struct sockaddr_in server;
    int port;
    int result[MAX_PORTS] = {0};

    // Création du socket
    sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock == -1) {
        perror("Échec de la création du socket");
        return -1;
    }

    server.sin_addr.s_addr = inet_addr(ip_addr);
    server.sin_family = AF_INET;

    // Scan des ports
    for (port = 1; port <= MAX_PORTS; port++) {
        server.sin_port = htons(port);

        // Connexion à l'hôte distant
        if (connect(sock, (struct sockaddr *)&server, sizeof(server)) < 0) {
            result[port - 1] = 0; // Port fermé
        } else {
            result[port - 1] = 1; // Port ouvert
            close(sock);
            sock = socket(AF_INET, SOCK_STREAM, 0); // Socket pour le prochain port
            if (sock == -1) {
                perror("Échec de la création du socket");
                return -1;
            }
        }
    }

    #pragma omp parallel for
    // Affichage des résultats
    for (port = 1; port <= MAX_PORTS; port++) {
        if (result[port - 1] == 1) {
            printf("Le port %d de %s est ouvert\n", port, ip_addr);
        }
    }

    return 1;
}

void scanVertical(const char* ip_addr) {
    for (int i = 0; i < 255; i++) {
        tnmap(ip_addr);
    }
}
