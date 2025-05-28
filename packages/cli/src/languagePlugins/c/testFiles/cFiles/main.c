#include "all.h"
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

    Employee* emp1 = create_employee(1, "Alice", "Manager", IT, 75000.0);
    print_employee_details(emp1);
    return 0;
}
