#include "cartographie/cartographie.h"
#include <stdio.h>
#include <string.h>

int main(int argc, char *argv[]) {
    if (argc < 3) {
        fprintf(stderr, "Utilisation : %s <mode> <ip>\n", argv[0]);
        fprintf(stderr, "Modes :\n");
        fprintf(stderr, "  -h: Scan horizontal\n");
        fprintf(stderr, "  -v: Scan vertical\n");
        fprintf(stderr, "Option:\n");
        fprintf(stderr, "  <ip>: IP à scanner verticalemnet or horizontalement (adresse de réseau)\n");
        return 1;
    }
    if (strcmp(argv[1], "-h") == 0) {
        scanHorizontal(argv[2]);
    } else if (strcmp(argv[1], "-v") == 0) {
        scanVertical(argv[2]);
    } else {
        fprintf(stderr, "Mode invalide\n");
        return 1;
    }
    return 0;
}
