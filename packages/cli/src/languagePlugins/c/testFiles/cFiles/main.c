#include "burgers.h"
#include <stdio.h>

int main(void) {
    struct Burger* burger = create_burger("Cheeseburger", (enum Condiment[]){SALAD, ONION}, (union Sauce){KETCHUP});
    printf("Burger ID: %d\n", burger->id);
    printf("Burger Name: %s\n", burger->name);
    printf("Burger Price: %.2f\n", burger->price);
    printf("Burger Condiments: ");
    for (int i = 0; i < 5; i++) {
        if (burger->condiments[i] != 0) {
            printf("%d ", burger->condiments[i]);
        }
    }
    printf("\n");
    printf("Burger Sauce: %d\n", burger->sauce.classic_sauce);
    return 0;
}
