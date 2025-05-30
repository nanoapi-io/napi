// TOTAL SYMBOL COUNT : 12
// TOTAL FUNCTION COUNT : 6
#ifndef PERSONNEL_H
#define PERSONNEL_H
#include <stdbool.h>

#define MAX_EMPLOYEES 100

enum Department {
    HR = 0,
    IT = 1,
    SALES = 2,
    MARKETING = 3,
    FINANCE = 4,
};

typedef struct {
    int id;
    char name[50];
    char position[50];
    enum Department department;
    float salary;
} Employee;

static int employee_count = 0;
static Employee* employees[MAX_EMPLOYEES];

Employee* create_employee(int id, const char* name, const char* position, enum Department department, float salary);
void destroy_employee(Employee* employee);
Employee* get_employee_by_id(int id);
Employee* get_highest_paid_employee();
Employee** get_employees_by_department(enum Department department, int* count);
void print_employee_details(const Employee* employee);

#endif
