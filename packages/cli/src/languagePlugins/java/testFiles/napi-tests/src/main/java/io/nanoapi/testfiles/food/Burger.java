package io.nanoapi.testfiles.food;

import java.io;
import java.lang.System;

public class Burger<T> implements Food {

    public void eat() {
        System.out.println("Yummy !");
    }

    public double getPrice() {
        T t = new T();
        if (t instanceof Food) {
            return t.getPrice() + 2.0;
        } else {
            return 2.0;
        }
    }

    public double getCalories() {
        T t = new T();
        if (t instanceof Food) {
            return t.getCalories + 50.0;
        } else {
            return 50.0;
        }
    }
}
