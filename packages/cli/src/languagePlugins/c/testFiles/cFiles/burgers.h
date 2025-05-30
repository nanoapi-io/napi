// TOTAL SYMBOL COUNT : 16
// TOTAL FUNCTION COUNT : 5
#ifndef BURGERS_H
#define BURGERS_H
#include <stdbool.h>

#define MAX_BURGERS 100
#define MAX(x, y) ((x) > (y) ? (x) : (y))

enum Condiment {
    NONE = 0,
    SALAD = 30,
    TOMATO = 40,
    ONION = 50,
    CHEESE = 60,
    PICKLE = 70,
};

enum ClassicSauces {
    KETCHUP = 0,
    MAYO = 1,
    MUSTARD = 2,
    BBQ = 3,
    SPICY = 4,
};

union Sauce {
    enum ClassicSauces classic_sauce;
    char custom_sauce[50];
};

typedef struct {
    int id;
    union Sauce sauce;
    _Bool salted;
    float price;
} Fries;

typedef enum Drink_t {
    COKE = 0,
    ICED_TEA = 1,
    LEMONADE = 2,
    COFFEE = 3,
    WATER = 4,
} Drink;

struct Burger {
    int id;
    char name[50];
    float price;
    enum Condiment condiments[5];
    union Sauce sauce;
};

const struct Burger classicBurger = {
    .id = 1,
    .name = "Classic Burger",
    .price = 5.99,
    .condiments = {SALAD, TOMATO, ONION, CHEESE},
    .sauce = {.classic_sauce = KETCHUP}
};

static int burger_count = 0;

struct Burger* create_burger(char name[50], enum Condiment condiments[5], union Sauce sauce);
void destroy_burger(struct Burger* burger);
struct Burger* get_burger_by_id(int id);
struct Burger* get_cheapest_burger();

#endif
