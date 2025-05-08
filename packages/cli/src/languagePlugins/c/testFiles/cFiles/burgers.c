// TOTAL SYMBOL COUNT : 1
// TOTAL FUNCTION COUNT : 0
#include "burgers.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static struct Burger* burgers[MAX_BURGERS];

struct Burger* create_burger(char name[50], enum Condiment condiments[5], union Sauce sauce) {
    struct Burger* new_burger = malloc(sizeof(struct Burger));
    if (new_burger == NULL) {
        return NULL; // Memory allocation failed
    }

    new_burger->id = ++burger_count;
    strncpy(new_burger->name, name, sizeof(new_burger->name) - 1);
    new_burger->name[sizeof(new_burger->name) - 1] = '\0'; // Ensure null-termination
    memcpy(new_burger->condiments, condiments, sizeof(new_burger->condiments));
    new_burger->sauce = sauce;

    return new_burger;
}

void destroy_burger(struct Burger* burger) {
    if (burger != NULL) {
        free(burger);
    }
}

struct Burger* get_burger_by_id(int id) {
    for (int i = 0; i < burger_count; i++) {
        if (burgers[i] != NULL && burgers[i]->id == id) {
            return burgers[i];
        }
    }
    return NULL; // Burger not found
}

struct Burger* get_cheapest_burger() {
    struct Burger* cheapest_burger = NULL;
    float min_price = __FLT_MAX__; // Initialize to maximum float value

    for (int i = 0; i < burger_count; i++) {
        if (burgers[i] != NULL && burgers[i]->price < min_price) {
            min_price = burgers[i]->price;
            cheapest_burger = burgers[i];
        }
    }

    return cheapest_burger;
}
