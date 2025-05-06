#ifndef BURGERS_H
#define BURGERS_H

enum Condiment {
    NONE = 0,
    SALAD = 30,
    TOMAT = 40,
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

struct Burger {
    int id;
    char name[50];
    float price;
    enum Condiment condiments[5];
};

union Sauce {
    enum ClassicSauces classic_sauce;
    char custom_sauce[50];
};

struct Burger* create_burger(char name[50], enum Condiment condiments[5], union Sauce sauce);
void destroy_burger(struct Burger* burger);
struct Burger* get_burger_by_id(int id);
struct Burger* get_cheapest_burger();

#endif
