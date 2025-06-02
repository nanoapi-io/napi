#include "cartographie.h"

void scanHorizontal(const char* network) {
    struct sockaddr_in addr;
    int sockfd, ttl = 64, timeout = 1000;
    char ip[INET_ADDRSTRLEN];

    // Création du socket
    sockfd = socket(AF_INET, SOCK_RAW, IPPROTO_ICMP);
    if (sockfd < 0) {
        perror("socket");
        exit(EXIT_FAILURE);
    }

    // Définition de l'option TTL
    if (setsockopt(sockfd, IPPROTO_IP, IP_TTL, &ttl, sizeof(ttl)) < 0) {
        perror("setsockopt");
        exit(EXIT_FAILURE);
    }

    // Définition de l'option de timeout
    struct timeval tv;
    tv.tv_sec = timeout / 1000;
    tv.tv_usec = (timeout % 1000) * 1000;
    if (setsockopt(sockfd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv)) < 0) {
        perror("setsockopt");
        exit(EXIT_FAILURE);
    }

    // Scan du réseau
    for (int i = 1; i <= 255; i++) {
        memset(&addr, 0, sizeof(addr));
        addr.sin_family = AF_INET;

        // Adresse --> octets
        int octet1, octet2, octet3, octet4;
        sscanf(network, "%d.%d.%d.%d", &octet1, &octet2, &octet3, &octet4);

        // Dernier octet --> i
        octet4 = i;

        // Réassemblement de l'adresse
        char host[INET_ADDRSTRLEN];
        sprintf(host, "%d.%d.%d.%d", octet1, octet2, octet3, octet4);

        // Conversion adresse en binaire
        inet_pton(AF_INET, host, &(addr.sin_addr));

        // Conversion adresse en texte
        inet_ntop(AF_INET, &(addr.sin_addr), ip, INET_ADDRSTRLEN);

        // Envoi du paquet ICMP
        struct icmphdr icmp;
        memset(&icmp, 0, sizeof(icmp));
        icmp.type = ICMP_ECHO;
        icmp.code = 0;
        icmp.checksum = htons(~(ICMP_ECHO << 8));

        if (sendto(sockfd, &icmp, sizeof(icmp), 0, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
            perror("sendto");
            continue;
        }

        // Attente de la réponse
        fd_set read_set;
        FD_ZERO(&read_set);
        FD_SET(sockfd, &read_set);
        struct timeval timeout;
        timeout.tv_sec = 1;
        timeout.tv_usec = 0;
        int select_result = select(sockfd + 1, &read_set, NULL, NULL, &timeout);
        if (select_result < 0) {
            perror("select");
            continue;
        } else if (select_result == 0) {
            printf("Aucune réponse de %s\n", ip);
            continue;
        }

        // Réception de la réponse
        char buffer[IP_MAXPACKET];
        struct sockaddr_in sender;
        socklen_t sender_len = sizeof(sender);
        ssize_t packet_len = recvfrom(sockfd, buffer, sizeof(buffer), 0, (struct sockaddr*)&sender, &sender_len);
        if (packet_len < 0) {
            perror("recvfrom");
            continue;
        }

        // Affichage de l'adresse
        printf("L'hôte %s est en ligne\n", ip);
    }

    // Fermeture socket
    close(sockfd);
}
