#include "personnel.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

Employee* create_employee(int id, const char* name, const char* position, enum Department department, float salary) {
    if (employee_count >= MAX_EMPLOYEES) {
        return NULL; // Maximum employee limit reached
    }

    Employee* new_employee = malloc(sizeof(Employee));
    if (new_employee == NULL) {
        return NULL; // Memory allocation failed
    }

    new_employee->id = id;
    strncpy(new_employee->name, name, sizeof(new_employee->name) - 1);
    new_employee->name[sizeof(new_employee->name) - 1] = '\0'; // Ensure null-termination
    strncpy(new_employee->position, position, sizeof(new_employee->position) - 1);
    new_employee->position[sizeof(new_employee->position) - 1] = '\0'; // Ensure null-termination
    new_employee->department = department;
    new_employee->salary = salary;

    employees[employee_count++] = new_employee;

    return new_employee;
}

void destroy_employee(Employee* employee) {
    if (employee != NULL) {
        free(employee);
    }
}

Employee* get_employee_by_id(int id) {
    for (int i = 0; i < employee_count; i++) {
        if (employees[i] != NULL && employees[i]->id == id) {
            return employees[i];
        }
    }
    return NULL; // Employee not found
}

Employee* get_highest_paid_employee() {
    Employee* highest_paid_employee = NULL;
    float max_salary = -1.0f; // Initialize to a negative value

    for (int i = 0; i < employee_count; i++) {
        if (employees[i] != NULL && employees[i]->salary > max_salary) {
            max_salary = employees[i]->salary;
            highest_paid_employee = employees[i];
        }
    }

    return highest_paid_employee;
}

Employee** get_employees_by_department(enum Department department, int* count) {
    Employee** department_employees = malloc(MAX_EMPLOYEES * sizeof(Employee*));
    if (department_employees == NULL) {
        *count = 0;
        return NULL; // Memory allocation failed
    }

    *count = 0;
    for (int i = 0; i < employee_count; i++) {
        if (employees[i] != NULL && employees[i]->department == department) {
            department_employees[(*count)++] = employees[i];
        }
    }

    return department_employees;
}

void print_employee_details(const Employee* employee) {
    if (employee != NULL) {
        printf("ID: %d\n", employee->id);
        printf("Name: %s\n", employee->name);
        printf("Position: %s\n", employee->position);
        printf("Department: %d\n", employee->department);
        printf("Salary: %.2f\n", employee->salary);
    } else {
        printf("Employee not found.\n");
    }
}
